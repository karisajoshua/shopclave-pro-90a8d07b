-- Apply once through Drizzle OR the matching Supabase migration, never both.
-- Checkout is one transaction: quote consumption, price validation, stock, tax and shipments.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key uuid;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_fingerprint text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS inventory_managed boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX IF NOT EXISTS orders_checkout_key ON public.orders(user_id,idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE TABLE IF NOT EXISTS public.checkout_stock_holds (
 order_id uuid NOT NULL REFERENCES public.orders(id),
 product_id uuid NOT NULL REFERENCES public.products(id),
 variant_id uuid REFERENCES public.product_variants(id),
 quantity integer NOT NULL CHECK(quantity>0),
 status text NOT NULL DEFAULT 'held' CHECK(status IN ('held','committed','released')),
 PRIMARY KEY(order_id,product_id),
 created_at timestamptz NOT NULL DEFAULT now()
);
-- One order may contain multiple variants of the same product.
ALTER TABLE public.checkout_stock_holds DROP CONSTRAINT checkout_stock_holds_pkey;
CREATE UNIQUE INDEX checkout_stock_holds_line ON public.checkout_stock_holds(order_id,product_id,coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid));
ALTER TABLE public.checkout_stock_holds ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_stock_holds FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.checkout_stock_holds TO service_role;
-- Customers must use the authenticated Edge Function, not write unreserved orders directly.
REVOKE INSERT ON public.orders,public.order_items FROM anon,authenticated;

CREATE OR REPLACE FUNCTION public.create_checkout_order(
 p_user uuid,p_key uuid,p_fingerprint text,p_order jsonb,p_items jsonb,p_quotes uuid[],p_snapshot jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE oid uuid; existing public.orders%ROWTYPE; l jsonb; p public.products%ROWTYPE;
 v public.product_variants%ROWTYPE; q public.shipping_quotes%ROWTYPE; qty int; vid uuid;
 sid uuid; iid uuid; shipping numeric:=0; goods numeric:=0; used_vendors uuid[]:='{}';
BEGIN
 IF p_key IS NULL OR p_user IS NULL OR coalesce(p_fingerprint,'')='' OR jsonb_array_length(p_items)=0 THEN RAISE EXCEPTION 'Invalid checkout'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_user::text||p_key::text,0));
 SELECT * INTO existing FROM public.orders WHERE user_id=p_user AND idempotency_key=p_key FOR UPDATE;
 IF FOUND THEN
  IF existing.checkout_fingerprint<>p_fingerprint THEN RAISE EXCEPTION 'Checkout key reused with different cart'; END IF;
  RETURN existing.id;
 END IF;
 -- Reserve every quote before creating anything. A competing checkout cannot consume it twice.
 FOR q IN SELECT * FROM public.shipping_quotes WHERE id=ANY(p_quotes) ORDER BY id FOR UPDATE LOOP
  IF q.user_id<>p_user OR q.consumed_order_id IS NOT NULL OR q.expires_at<=now() THEN RAISE EXCEPTION 'Shipping selection expired or already used'; END IF;
  shipping:=shipping+q.amount_cad;
 END LOOP;
 IF (SELECT count(*) FROM public.shipping_quotes WHERE id=ANY(p_quotes))<>cardinality(p_quotes) THEN RAISE EXCEPTION 'Shipping selection missing'; END IF;
 IF round(shipping,2)<>(p_order->>'shipping_total')::numeric THEN RAISE EXCEPTION 'Shipping price changed'; END IF;
 -- Product rows lock before variants, in a consistent order across all operations.
 FOR l IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'product_id',value->>'variant_id' LOOP
  SELECT * INTO p FROM public.products WHERE id=(l->>'product_id')::uuid FOR UPDATE;
  IF NOT FOUND OR p.status<>'active' OR p.vendor_id<>(l->>'vendor_id')::uuid THEN RAISE EXCEPTION 'Product unavailable'; END IF;
  qty:=(l->>'quantity')::int; vid:=nullif(l->>'variant_id','')::uuid;
  IF qty<=0 THEN RAISE EXCEPTION 'Invalid quantity'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.vendors WHERE id=p.vendor_id AND status='approved') THEN RAISE EXCEPTION 'Seller unavailable'; END IF;
  IF vid IS NULL THEN
   IF EXISTS(SELECT 1 FROM public.product_variants WHERE product_id=p.id) THEN RAISE EXCEPTION 'Select product options'; END IF;
   IF p.price<>(l->>'price')::numeric OR p.stock<qty THEN RAISE EXCEPTION 'Price or stock changed'; END IF;
   UPDATE public.products SET stock=stock-qty WHERE id=p.id;
  ELSE
   SELECT * INTO v FROM public.product_variants WHERE id=vid AND product_id=p.id FOR UPDATE;
   IF NOT FOUND OR coalesce(v.price,p.price)<>(l->>'price')::numeric OR v.stock<qty THEN RAISE EXCEPTION 'Variant price or stock changed'; END IF;
   UPDATE public.product_variants SET stock=stock-qty WHERE id=vid;
  END IF;
  goods:=goods+(l->>'price')::numeric*qty;
 END LOOP;
 IF round(goods+shipping+(p_order->>'tax_amount')::numeric,2)<>(p_order->>'total')::numeric THEN RAISE EXCEPTION 'Order total mismatch'; END IF;
 INSERT INTO public.orders(user_id,total,shipping_total,tax_amount,tax_province,tax_breakdown,tax_engine_version,shipping_address,payment_method,currency,status,payment_status,idempotency_key,checkout_fingerprint,inventory_managed)
 SELECT p_user,r.total,r.shipping_total,r.tax_amount,r.tax_province,r.tax_breakdown,r.tax_engine_version,r.shipping_address,r.payment_method,'CAD','pending','pending',p_key,p_fingerprint,true
 FROM jsonb_populate_record(null::public.orders,p_order) r RETURNING id INTO oid;
 FOR l IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  INSERT INTO public.order_items(order_id,product_id,vendor_id,quantity,price,commission_amount,variant_id,variant_options,tax_category,tax_amount,tax_breakdown,shipping_amount,shipping_rate_id,carrier)
  SELECT oid,r.product_id,r.vendor_id,r.quantity,r.price,r.commission_amount,r.variant_id,r.variant_options,r.tax_category,r.tax_amount,r.tax_breakdown,
   coalesce((SELECT amount_cad FROM public.shipping_quotes WHERE id=ANY(p_quotes) AND vendor_id=r.vendor_id AND NOT(r.vendor_id=ANY(used_vendors))),0),
   (SELECT rate_id FROM public.shipping_quotes WHERE id=ANY(p_quotes) AND vendor_id=r.vendor_id),
   (SELECT provider FROM public.shipping_quotes WHERE id=ANY(p_quotes) AND vendor_id=r.vendor_id)
  FROM jsonb_populate_record(null::public.order_items,l) r RETURNING id INTO iid;
  used_vendors:=array_append(used_vendors,(l->>'vendor_id')::uuid);
  INSERT INTO public.checkout_stock_holds(order_id,product_id,variant_id,quantity) VALUES(oid,(l->>'product_id')::uuid,nullif(l->>'variant_id','')::uuid,(l->>'quantity')::int)
   ON CONFLICT(order_id,product_id,(coalesce(variant_id,'00000000-0000-0000-0000-000000000000'::uuid))) DO UPDATE SET quantity=public.checkout_stock_holds.quantity+excluded.quantity;
 END LOOP;
 INSERT INTO public.order_tax_snapshots(order_id,tax_point,province,request,result,engine_version)
 VALUES(oid,(p_snapshot->>'tax_point')::date,p_order->>'tax_province',p_snapshot->'request',p_snapshot->'result',p_order->>'tax_engine_version');
 FOR q IN SELECT * FROM public.shipping_quotes WHERE id=ANY(p_quotes) LOOP
  INSERT INTO public.shipments(order_id,vendor_id,quote_id,status,carrier,service,rate_id,is_estimate,shippo_shipment_id,shipping_amount_original,shipping_currency_original,fx_rate_to_cad,shipping_amount_cad,fulfilment_mode)
  VALUES(oid,q.vendor_id,q.id,'preparing',q.provider,q.service,q.rate_id,q.is_estimate,q.parcel->>'shippo_shipment_id',q.amount_original,q.currency_original,q.fx_rate_to_cad,q.amount_cad,CASE WHEN q.is_estimate THEN 'manual' ELSE 'integrated' END)
  RETURNING id INTO sid;
  INSERT INTO public.shipment_items(shipment_id,order_item_id,quantity) SELECT sid,id,quantity FROM public.order_items WHERE order_id=oid AND vendor_id=q.vendor_id;
  INSERT INTO public.tracking_events(shipment_id,status,description,provider_event_key) VALUES(sid,'preparing','Order received; awaiting payment confirmation','created-'||sid);
  UPDATE public.shipping_quotes SET consumed_order_id=oid WHERE id=q.id;
 END LOOP;
 RETURN oid;
END $$;

-- Release only after a provider-confirmed failed/expired session. No timer blindly releases an asynchronous payment hold.
CREATE OR REPLACE FUNCTION public.release_checkout_stock(p_order uuid,p_session text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; h record;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR o.payment_status='paid' OR o.stripe_checkout_session_id IS DISTINCT FROM p_session THEN RETURN; END IF;
 FOR h IN SELECT * FROM public.checkout_stock_holds WHERE order_id=p_order AND status='held' ORDER BY product_id,variant_id FOR UPDATE LOOP
  PERFORM 1 FROM public.products WHERE id=h.product_id FOR UPDATE;
  IF h.variant_id IS NULL THEN UPDATE public.products SET stock=stock+h.quantity WHERE id=h.product_id;
  ELSE UPDATE public.product_variants SET stock=stock+h.quantity WHERE id=h.variant_id; END IF;
 END LOOP;
 UPDATE public.checkout_stock_holds SET status='released' WHERE order_id=p_order AND status='held';
 UPDATE public.orders SET payment_status='failed' WHERE id=p_order;
END $$;

CREATE OR REPLACE FUNCTION public.confirm_stripe_checkout(p_order uuid,p_session text,p_intent text,p_cents bigint,p_currency text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE o public.orders%ROWTYPE; i record;
BEGIN
 SELECT * INTO o FROM public.orders WHERE id=p_order FOR UPDATE;
 IF p_session IS NULL OR p_intent IS NULL OR p_cents IS NULL OR p_currency IS NULL THEN RAISE EXCEPTION 'Incomplete payment'; END IF;
 IF NOT FOUND OR o.payment_provider<>'stripe' OR o.stripe_checkout_session_id IS DISTINCT FROM p_session OR o.stripe_payment_intent_id IS NOT NULL AND o.stripe_payment_intent_id<>p_intent THEN RAISE EXCEPTION 'Session does not match order'; END IF;
 IF o.charged_amount IS NULL OR round(o.charged_amount*100)<>p_cents OR upper(o.charged_currency)<>upper(p_currency) THEN RAISE EXCEPTION 'Payment amount mismatch'; END IF;
 IF o.payment_status='paid' THEN RETURN; END IF;
 IF o.inventory_managed AND (NOT EXISTS(SELECT 1 FROM public.checkout_stock_holds WHERE order_id=p_order) OR EXISTS(SELECT 1 FROM public.checkout_stock_holds WHERE order_id=p_order AND status='released')) THEN RAISE EXCEPTION 'Stock hold unavailable; payment needs reconciliation'; END IF;
 UPDATE public.checkout_stock_holds SET status='committed' WHERE order_id=p_order AND status='held';
 UPDATE public.orders SET payment_status='paid',status='processing',stripe_payment_intent_id=p_intent WHERE id=p_order;
 FOR i IN SELECT * FROM public.order_items WHERE order_id=p_order LOOP
  INSERT INTO public.vendor_ledger(vendor_id,order_item_id,entry_type,amount,currency,status,stripe_reference,notes)
  VALUES(i.vendor_id,i.id,'sale',coalesce(i.vendor_payout,0)+coalesce(i.shipping_amount,0),'CAD','available',p_intent,'Platform-collected via Stripe') ON CONFLICT(order_item_id,entry_type) DO NOTHING;
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.create_checkout_order(uuid,uuid,text,jsonb,jsonb,uuid[],jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.release_checkout_stock(uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.confirm_stripe_checkout(uuid,text,text,bigint,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.create_checkout_order(uuid,uuid,text,jsonb,jsonb,uuid[],jsonb),public.release_checkout_stock(uuid,text),public.confirm_stripe_checkout(uuid,text,text,bigint,text) TO service_role;

ALTER TABLE public.payment_refunds ALTER COLUMN paystack_reference DROP NOT NULL;
ALTER TABLE public.payment_refunds ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'paystack';
ALTER TABLE public.payment_refunds ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
ALTER TABLE public.payment_refunds ADD COLUMN IF NOT EXISTS tax_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payment_refunds ADD COLUMN IF NOT EXISTS merchandise_amount numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payment_refunds ADD COLUMN IF NOT EXISTS vendor_debit numeric(12,2) NOT NULL DEFAULT 0;
ALTER TABLE public.payment_refunds ADD COLUMN IF NOT EXISTS refund_quantity int NOT NULL DEFAULT 0;
ALTER TABLE public.payment_refunds ADD COLUMN IF NOT EXISTS stripe_reversal_id text;
CREATE TABLE public.stripe_seller_transfers (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_item_id uuid NOT NULL UNIQUE REFERENCES public.order_items(id),
 vendor_id uuid NOT NULL REFERENCES public.vendors(id), destination text NOT NULL, amount numeric(12,2) NOT NULL CHECK(amount>0),
 status text NOT NULL DEFAULT 'processing' CHECK(status IN ('processing','completed','reversed')),
 provider_transfer_id text UNIQUE, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
ALTER TABLE public.stripe_seller_transfers ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.stripe_seller_transfers TO service_role;
GRANT SELECT ON public.stripe_seller_transfers TO authenticated;
CREATE POLICY stripe_transfer_read ON public.stripe_seller_transfers FOR SELECT TO authenticated USING(public.has_role((SELECT auth.uid()),'admin') OR EXISTS(SELECT 1 FROM public.vendors v WHERE v.id=vendor_id AND v.user_id=(SELECT auth.uid())));

CREATE FUNCTION public.claim_stripe_refund(p_return uuid,p_admin uuid) RETURNS public.payment_refunds
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE rr public.return_requests%ROWTYPE; o public.orders%ROWTYPE; i public.order_items%ROWTYPE; f public.payment_refunds%ROWTYPE;
 prior_qty int; total_tax numeric; merchandise numeric; debit numeric;
BEGIN
 IF NOT public.has_role(p_admin,'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT * INTO rr FROM public.return_requests WHERE id=p_return;
 IF NOT FOUND THEN RAISE EXCEPTION 'Return not found'; END IF;
 SELECT * INTO o FROM public.orders WHERE id=rr.order_id FOR UPDATE;
 SELECT * INTO i FROM public.order_items WHERE id=rr.order_item_id AND order_id=o.id FOR UPDATE;
 SELECT * INTO rr FROM public.return_requests WHERE id=p_return FOR UPDATE;
 SELECT * INTO f FROM public.payment_refunds WHERE return_request_id=p_return;
 IF FOUND THEN RETURN f; END IF;
 IF rr.status NOT IN ('approved','received','inspected','refund_approved') OR o.payment_status<>'paid' OR o.payment_provider<>'stripe' OR o.stripe_payment_intent_id IS NULL OR upper(o.charged_currency)<>'CAD' THEN RAISE EXCEPTION 'No approved refundable Stripe payment'; END IF;
 IF EXISTS(SELECT 1 FROM public.stripe_seller_transfers WHERE order_item_id=i.id AND status='processing') THEN RAISE EXCEPTION 'Seller transfer is pending reconciliation'; END IF;
 SELECT coalesce(sum(refund_quantity),0) INTO prior_qty FROM public.payment_refunds WHERE order_item_id=i.id AND status IN ('processing','pending','processed');
 IF rr.quantity IS NULL OR rr.quantity<1 OR prior_qty+rr.quantity>i.quantity THEN RAISE EXCEPTION 'Refund quantity exceeds purchased quantity'; END IF;
 merchandise:=round(i.price*rr.quantity,2);
 -- Cumulative allocation assigns any rounding cent to the final returned unit.
 total_tax:=round(coalesce(i.tax_amount,0)*(prior_qty+rr.quantity)/i.quantity,2)-round(coalesce(i.tax_amount,0)*prior_qty/i.quantity,2);
 debit:=round(coalesce(i.vendor_payout,0)*(prior_qty+rr.quantity)/i.quantity,2)-round(coalesce(i.vendor_payout,0)*prior_qty/i.quantity,2);
 IF merchandise+total_tax<=0 OR (SELECT coalesce(sum(provider_amount),0) FROM public.payment_refunds WHERE order_id=o.id AND status IN ('processing','pending','processed'))+merchandise+total_tax>o.charged_amount THEN RAISE EXCEPTION 'Refund exceeds remaining charge'; END IF;
 INSERT INTO public.payment_refunds(return_request_id,order_id,order_item_id,provider,stripe_payment_intent_id,amount,currency,provider_amount,provider_currency,fx_rate_used,status,requested_by,merchandise_amount,tax_amount,vendor_debit,refund_quantity)
 VALUES(rr.id,o.id,i.id,'stripe',o.stripe_payment_intent_id,merchandise+total_tax,'CAD',merchandise+total_tax,'CAD',1,'processing',p_admin,merchandise,total_tax,debit,rr.quantity) RETURNING * INTO f;
 UPDATE public.return_requests SET status='refund_processing' WHERE id=rr.id;
 RETURN f;
END $$;

CREATE FUNCTION public.complete_stripe_refund(p_id uuid,p_provider_id text,p_status text,p_cents bigint,p_currency text,p_intent text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE f public.payment_refunds%ROWTYPE; item public.order_items%ROWTYPE;
BEGIN
 SELECT * INTO f FROM public.payment_refunds WHERE id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Refund not found'; END IF;
 PERFORM 1 FROM public.orders WHERE id=f.order_id FOR UPDATE;
 SELECT * INTO item FROM public.order_items WHERE id=f.order_item_id FOR UPDATE;
 SELECT * INTO f FROM public.payment_refunds WHERE id=p_id FOR UPDATE;
 IF p_cents IS NULL OR p_currency IS NULL OR p_provider_id IS NULL THEN RAISE EXCEPTION 'Incomplete refund'; END IF;
 IF NOT FOUND OR f.provider<>'stripe' OR p_intent IS DISTINCT FROM f.stripe_payment_intent_id OR p_cents<>round(f.provider_amount*100) OR upper(p_currency)<>'CAD' OR (f.provider_refund_id IS NOT NULL AND f.provider_refund_id<>p_provider_id) THEN RAISE EXCEPTION 'Refund mismatch'; END IF;
 IF f.status IN ('processed','failed') THEN RETURN; END IF;
 UPDATE public.payment_refunds SET provider_refund_id=p_provider_id,status=CASE WHEN p_status='succeeded' THEN 'processed' WHEN p_status IN ('failed','canceled') THEN 'failed' ELSE 'pending' END,updated_at=now() WHERE id=f.id;
 IF p_status='succeeded' THEN
  SELECT * INTO item FROM public.order_items WHERE id=f.order_item_id FOR UPDATE;
  UPDATE public.order_items SET refunded_amount=refunded_amount+f.merchandise_amount,refunded_amount_provider=refunded_amount_provider+f.provider_amount WHERE id=item.id;
  UPDATE public.return_requests SET status='refunded',refund_amount_cad=f.amount,refund_reference=p_provider_id WHERE id=f.return_request_id;
  INSERT INTO public.vendor_ledger(vendor_id,order_item_id,entry_type,amount,currency,status,stripe_reference,notes)
  VALUES(item.vendor_id,item.id,'refund',-f.vendor_debit,'CAD','available',p_provider_id,'Stripe refund; tax retained in refund audit')
  ON CONFLICT(order_item_id,entry_type) DO UPDATE SET amount=public.vendor_ledger.amount-f.vendor_debit;
 ELSIF p_status IN ('failed','canceled') THEN
  UPDATE public.return_requests SET status='refund_rejected',admin_notes='Stripe refund failed; review provider status and any transfer reversal before retrying.' WHERE id=f.return_request_id;
 END IF;
END $$;

CREATE FUNCTION public.claim_stripe_transfer(p_item uuid,p_admin uuid) RETURNS public.stripe_seller_transfers
LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
DECLARE i public.order_items%ROWTYPE; o public.orders%ROWTYPE; t public.stripe_seller_transfers%ROWTYPE; dest text; amt numeric;
BEGIN
 IF NOT public.has_role(p_admin,'admin') THEN RAISE EXCEPTION 'Admin required'; END IF;
 SELECT * INTO i FROM public.order_items WHERE id=p_item;
 SELECT * INTO o FROM public.orders WHERE id=i.order_id FOR UPDATE;
 SELECT * INTO i FROM public.order_items WHERE id=p_item FOR UPDATE;
 SELECT * INTO t FROM public.stripe_seller_transfers WHERE order_item_id=p_item;
 IF FOUND THEN RETURN t; END IF;
 IF o.payment_status<>'paid' OR o.payment_provider<>'stripe' OR upper(o.charged_currency)<>'CAD' THEN RAISE EXCEPTION 'Verified CAD Stripe payment required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.shipments WHERE order_id=o.id AND vendor_id=i.vendor_id AND status='delivered' AND delivered_at<now()-interval '7 days') THEN RAISE EXCEPTION 'Delivery and seven-day return window must be completed'; END IF;
 IF EXISTS(SELECT 1 FROM public.return_requests WHERE order_item_id=i.id AND status NOT IN ('rejected','refunded')) OR EXISTS(SELECT 1 FROM public.payment_refunds WHERE order_item_id=i.id AND status IN ('pending','processing','failed')) THEN RAISE EXCEPTION 'Resolve returns and refunds first'; END IF;
 IF EXISTS(SELECT 1 FROM public.withdrawal_requests WHERE vendor_id=i.vendor_id AND status IN ('pending','approved','completed')) THEN RAISE EXCEPTION 'Reconcile legacy withdrawals before Stripe settlement'; END IF;
 SELECT pa.provider_account_id INTO dest FROM public.seller_payout_accounts pa JOIN public.seller_applications a ON a.id=pa.application_id JOIN public.vendors v ON v.user_id=a.user_id
 WHERE v.id=i.vendor_id AND v.status='approved' AND a.status='approved' AND a.kyc_status='verified' AND pa.provider='stripe' AND pa.verification_status='verified' AND pa.transfers_enabled LIMIT 1;
 IF dest IS NULL THEN RAISE EXCEPTION 'Verified seller payout account required'; END IF;
 SELECT coalesce(sum(amount),0) INTO amt FROM public.vendor_ledger WHERE order_item_id=i.id AND entry_type IN ('sale','refund') AND currency='CAD';
 IF amt<=0 OR amt>coalesce(i.vendor_payout,0)+coalesce(i.shipping_amount,0) THEN RAISE EXCEPTION 'No reconciled payable balance'; END IF;
 INSERT INTO public.stripe_seller_transfers(order_item_id,vendor_id,destination,amount) VALUES(i.id,i.vendor_id,dest,amt) RETURNING * INTO t;
 RETURN t;
END $$;
ALTER TABLE public.seller_payout_accounts ADD COLUMN IF NOT EXISTS transfers_enabled boolean NOT NULL DEFAULT false;
REVOKE ALL ON FUNCTION public.claim_stripe_refund(uuid,uuid),public.complete_stripe_refund(uuid,text,text,bigint,text,text),public.claim_stripe_transfer(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_stripe_refund(uuid,uuid),public.complete_stripe_refund(uuid,text,text,bigint,text,text),public.claim_stripe_transfer(uuid,uuid) TO service_role;
-- Legacy requests remain available for historical reconciliation; new payouts go through Stripe.
REVOKE INSERT,UPDATE ON public.withdrawal_requests FROM anon,authenticated;
