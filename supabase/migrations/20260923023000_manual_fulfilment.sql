-- Explicit workflow for parcels that cannot use a live Shippo label.
alter table public.shipments
  add column if not exists fulfilment_mode text not null default 'integrated'
    check (fulfilment_mode in ('integrated','manual')),
  add column if not exists manual_carrier text,
  add column if not exists manual_tracking_number text,
  add column if not exists manual_booking_reference text,
  add column if not exists manual_booked_at timestamptz;

update public.shipments
set fulfilment_mode = 'manual',
    status = case when status = 'preparing' then 'manual_booking_required' else status end
where is_estimate = true or rate_id is null;

create or replace function public.protect_shipment_financials()
returns trigger language plpgsql security definer set search_path=public as $$
declare is_service boolean := coalesce(auth.role(),'')='service_role';
begin
  if is_service then return new; end if;
  if new.shipping_amount_original is distinct from old.shipping_amount_original
     or new.shipping_currency_original is distinct from old.shipping_currency_original
     or new.fx_rate_to_cad is distinct from old.fx_rate_to_cad
     or new.shipping_amount_cad is distinct from old.shipping_amount_cad
     or new.rate_id is distinct from old.rate_id
     or new.label_url is distinct from old.label_url
     or new.shippo_transaction_id is distinct from old.shippo_transaction_id then
    raise exception 'Shipment financial/provider fields are server-managed';
  end if;
  return new;
end $$;
drop trigger if exists protect_shipment_financials_trg on public.shipments;
create trigger protect_shipment_financials_trg before update on public.shipments
for each row execute function public.protect_shipment_financials();
