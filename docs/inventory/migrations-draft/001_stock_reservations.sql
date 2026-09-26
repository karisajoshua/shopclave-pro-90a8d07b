-- DRAFT ONLY — NOT APPLIED. Review in a draft/branch DB before production.
-- NOT atomic with create-order yet: create-order inserts via separate PostgREST calls.
-- Atomicity requires a single create_order_with_reservation RPC (not written).
-- Session vs hold expiry: stripe-initialize must set Stripe expires_at <= hold expires_at
-- (Stripe min 30 min, so TTL >= 30 min + grace). Late/async payments after expiry still
-- land in commit_order_stock and are either fulfilled from free stock or recorded as exceptions.
-- Additive: no existing column/constraint changed; create-order behaviour unchanged until wired in.

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS orders_user_idempotency_key
  ON public.orders (user_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  vendor_id uuid NOT NULL REFERENCES public.vendors(id),
  product_id uuid NOT NULL REFERENCES public.products(id),
  variant_id uuid REFERENCES public.product_variants(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','committed','released','exception')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_reservations_line_key
  ON public.stock_reservations (order_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid))
  WHERE status IN ('reserved','committed','exception');
CREATE INDEX IF NOT EXISTS stock_reservations_active_idx
  ON public.stock_reservations (product_id, variant_id) WHERE status = 'reserved';

GRANT ALL ON public.stock_reservations TO service_role;
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;
-- No browser policies: server-only table.

-- Atomic reserve. _lines = [{"product_id":..,"variant_id":..|null,"vendor_id":..,"quantity":n}]
-- Idempotent: re-running for the same order returns existing reservations if still active.
CREATE OR REPLACE FUNCTION public.reserve_order_stock(_order_id uuid, _lines jsonb, _ttl_minutes int DEFAULT 30)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE l record; avail int;
BEGIN
  -- Retry: already paid/flagged → nothing to do; live hold → extend; expired hold → release and re-check stock.
  IF EXISTS (SELECT 1 FROM stock_reservations WHERE order_id = _order_id AND status IN ('committed','exception')) THEN
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM stock_reservations WHERE order_id = _order_id AND status = 'reserved' AND expires_at > now()) THEN
    UPDATE stock_reservations SET expires_at = now() + make_interval(mins => _ttl_minutes), updated_at = now()
      WHERE order_id = _order_id AND status = 'reserved';
    RETURN;
  END IF;
  UPDATE stock_reservations SET status = 'released', updated_at = now()
    WHERE order_id = _order_id AND status = 'reserved';
  -- Lock rows in deterministic order to avoid deadlocks across vendors/products.
  FOR l IN
    SELECT (x->>'product_id')::uuid pid, NULLIF(x->>'variant_id','')::uuid vid,
           (x->>'vendor_id')::uuid ven, (x->>'quantity')::int qty
    FROM jsonb_array_elements(_lines) x ORDER BY 1, 2 NULLS FIRST
  LOOP
    IF l.qty IS NULL OR l.qty <= 0 THEN RAISE EXCEPTION 'invalid quantity'; END IF;
    IF l.vid IS NULL THEN
      SELECT stock INTO avail FROM products WHERE id = l.pid AND vendor_id = l.ven FOR UPDATE;
    ELSE
      SELECT v.stock INTO avail FROM product_variants v JOIN products p ON p.id = v.product_id
        WHERE v.id = l.vid AND v.product_id = l.pid AND p.vendor_id = l.ven FOR UPDATE OF v;
    END IF;
    IF avail IS NULL THEN RAISE EXCEPTION 'product not found'; END IF;
    avail := avail - COALESCE((SELECT sum(quantity) FROM stock_reservations
      WHERE product_id = l.pid AND variant_id IS NOT DISTINCT FROM l.vid
        AND status = 'reserved' AND expires_at > now()), 0);
    IF avail < l.qty THEN RAISE EXCEPTION 'insufficient_stock:%', l.pid; END IF;
    INSERT INTO stock_reservations(order_id, vendor_id, product_id, variant_id, quantity, expires_at)
      VALUES (_order_id, l.ven, l.pid, l.vid, l.qty, now() + make_interval(mins => _ttl_minutes));
  END LOOP;
END $$;

-- Paid-but-unfulfillable exceptions (late payment after hold expiry, stock gone).
-- Payment is NOT silently accepted: order is flagged for admin refund/backorder decision.
CREATE TABLE IF NOT EXISTS public.stock_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  reservation_id uuid NOT NULL REFERENCES public.stock_reservations(id) ON DELETE CASCADE,
  product_id uuid NOT NULL,
  variant_id uuid,
  requested_qty integer NOT NULL,
  available_qty integer NOT NULL,
  reason text NOT NULL DEFAULT 'paid_after_hold_expiry_insufficient_stock',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','refunded','backordered','resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  UNIQUE (reservation_id)
);
GRANT ALL ON public.stock_exceptions TO service_role;
GRANT SELECT ON public.stock_exceptions TO authenticated;
ALTER TABLE public.stock_exceptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read stock exceptions" ON public.stock_exceptions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Called only from verified-paid webhook. Never drives stock negative.
-- Lock order: reservations then stock rows, both sorted (product_id, variant_id NULLS FIRST),
-- identical to reserve_order_stock, so concurrent reserve/commit cannot deadlock.
-- Idempotent: only 'reserved' rows are processed; committed/released/exception are terminal.
-- Returns number of exception lines (0 = fully fulfilled). Caller must NOT mark the order
-- fulfillable / trigger labels when > 0; it sets an admin-review flag instead.
CREATE OR REPLACE FUNCTION public.commit_order_stock(_order_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; cur int; held_by_others int; exceptions int := 0;
BEGIN
  FOR r IN SELECT * FROM stock_reservations WHERE order_id = _order_id AND status = 'reserved'
           ORDER BY product_id, variant_id NULLS FIRST FOR UPDATE LOOP
    IF r.variant_id IS NULL THEN
      SELECT stock INTO cur FROM products WHERE id = r.product_id FOR UPDATE;
    ELSE
      SELECT stock INTO cur FROM product_variants WHERE id = r.variant_id FOR UPDATE;
    END IF;
    -- A still-valid hold was already counted against availability; an expired one was not,
    -- so other live holds must be respected before we can take stock for it.
    held_by_others := CASE WHEN r.expires_at > now() THEN 0 ELSE COALESCE((
      SELECT sum(quantity) FROM stock_reservations
      WHERE product_id = r.product_id AND variant_id IS NOT DISTINCT FROM r.variant_id
        AND status = 'reserved' AND expires_at > now() AND id <> r.id), 0) END;
    IF cur IS NULL OR cur - held_by_others < r.quantity THEN
      INSERT INTO stock_exceptions(order_id, reservation_id, product_id, variant_id, requested_qty, available_qty)
        VALUES (_order_id, r.id, r.product_id, r.variant_id, r.quantity, GREATEST(COALESCE(cur,0) - held_by_others, 0))
        ON CONFLICT (reservation_id) DO NOTHING;
      UPDATE stock_reservations SET status = 'exception', updated_at = now() WHERE id = r.id;
      exceptions := exceptions + 1;
    ELSE
      IF r.variant_id IS NULL THEN
        UPDATE products SET stock = stock - r.quantity WHERE id = r.product_id AND stock >= r.quantity;
      ELSE
        UPDATE product_variants SET stock = stock - r.quantity WHERE id = r.variant_id AND stock >= r.quantity;
      END IF;
      UPDATE stock_reservations SET status = 'committed', updated_at = now() WHERE id = r.id;
    END IF;
  END LOOP;
  RETURN (SELECT count(*)::int FROM stock_reservations
    WHERE order_id = _order_id AND status = 'exception');
END $$;

-- Payment failed / session expired / cancelled before payment. Never touches committed rows.
CREATE OR REPLACE FUNCTION public.release_order_stock(_order_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE stock_reservations SET status = 'released', updated_at = now()
  WHERE order_id = _order_id AND status = 'reserved';
$$;

REVOKE ALL ON FUNCTION public.reserve_order_stock(uuid, jsonb, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_order_stock(uuid) FROM PUBLIC, anon, authenticated;
-- stock_exceptions: admins read via RLS; writes are service_role only.
REVOKE ALL ON FUNCTION public.release_order_stock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock(uuid, jsonb, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_order_stock(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_stock(uuid) TO service_role;
