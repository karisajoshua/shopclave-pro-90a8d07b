-- DRAFT ONLY — NOT APPLIED. Review in a draft/branch DB before production.
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
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','committed','released')),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS stock_reservations_line_key
  ON public.stock_reservations (order_id, product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid));
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
  IF EXISTS (SELECT 1 FROM stock_reservations WHERE order_id = _order_id AND status IN ('reserved','committed')) THEN
    UPDATE stock_reservations SET expires_at = now() + make_interval(mins => _ttl_minutes), updated_at = now()
      WHERE order_id = _order_id AND status = 'reserved';
    RETURN;
  END IF;
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

-- Called only from verified-paid webhook. Replay-safe: only 'reserved' rows move.
-- Commits even if expired (payment settled) — may drive stock negative; flagged for admin, never silently dropped.
CREATE OR REPLACE FUNCTION public.commit_order_stock(_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM stock_reservations WHERE order_id = _order_id AND status = 'reserved'
           ORDER BY product_id, variant_id NULLS FIRST FOR UPDATE LOOP
    IF r.variant_id IS NULL THEN
      UPDATE products SET stock = stock - r.quantity WHERE id = r.product_id;
    ELSE
      UPDATE product_variants SET stock = stock - r.quantity WHERE id = r.variant_id;
    END IF;
    UPDATE stock_reservations SET status = 'committed', updated_at = now() WHERE id = r.id;
  END LOOP;
END $$;

-- Payment failed / session expired / cancelled before payment. Never touches committed rows.
CREATE OR REPLACE FUNCTION public.release_order_stock(_order_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE stock_reservations SET status = 'released', updated_at = now()
  WHERE order_id = _order_id AND status = 'reserved';
$$;

REVOKE ALL ON FUNCTION public.reserve_order_stock(uuid, jsonb, int) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.commit_order_stock(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.release_order_stock(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_order_stock(uuid, jsonb, int) TO service_role;
GRANT EXECUTE ON FUNCTION public.commit_order_stock(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_order_stock(uuid) TO service_role;
