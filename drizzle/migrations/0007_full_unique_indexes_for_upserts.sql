-- Upserts use ON CONFLICT (cols) without a predicate, which cannot match partial unique indexes.
-- Full unique indexes are equivalent here because NULLs are distinct in Postgres unique indexes.
CREATE UNIQUE INDEX IF NOT EXISTS vendor_ledger_item_entry_key
  ON public.vendor_ledger (order_item_id, entry_type);
CREATE UNIQUE INDEX IF NOT EXISTS tracking_events_shipment_event_key
  ON public.tracking_events (shipment_id, provider_event_key);