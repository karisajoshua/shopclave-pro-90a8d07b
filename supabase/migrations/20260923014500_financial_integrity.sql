-- Financial integrity hardening for marketplace fulfilment.
-- Server/service-role workflows remain able to update these values; vendors cannot.

alter table public.order_items
  add column if not exists vendor_payout numeric,
  add column if not exists refunded_amount numeric not null default 0;

-- Backfill the payout from server-calculated price/quantity/commission.
update public.order_items
set vendor_payout = greatest(
  0,
  (coalesce(price,0) * coalesce(quantity,0)) - coalesce(commission_amount,0)
)
where vendor_payout is null;

-- One sale credit per order line prevents duplicate webhook deliveries from
-- crediting a vendor twice.
create unique index if not exists vendor_ledger_sale_order_item_uidx
  on public.vendor_ledger(order_item_id)
  where entry_type = 'sale';

-- Refund audit records. Paystack calls are keyed by return_request_id so a
-- retry can never intentionally create a second marketplace refund.
create table if not exists public.payment_refunds (
  id uuid primary key default gen_random_uuid(),
  return_request_id uuid not null unique references public.return_requests(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  paystack_reference text,
  amount numeric not null check (amount > 0),
  currency text not null,
  status text not null default 'pending'
    check (status in ('pending','processing','processed','failed')),
  provider_refund_id text,
  provider_payload jsonb,
  failure_reason text,
  requested_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_refunds enable row level security;

drop policy if exists "Admins can view refunds" on public.payment_refunds;
create policy "Admins can view refunds"
on public.payment_refunds for select
to authenticated
using (
  exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  )
);

-- Vendors may update operational fields on their order lines, but never
-- financial/payment fields. Trigger is deliberately defensive even if an RLS
-- policy is broadened later.
create or replace function public.protect_order_item_financials()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
  is_admin boolean := exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  );
begin
  if is_service or is_admin then return new; end if;

  if new.price is distinct from old.price
     or new.quantity is distinct from old.quantity
     or new.commission_amount is distinct from old.commission_amount
     or new.vendor_payout is distinct from old.vendor_payout
     or new.shipping_amount is distinct from old.shipping_amount
     or new.shipping_rate_id is distinct from old.shipping_rate_id
     or new.paystack_split_code is distinct from old.paystack_split_code
     or new.refunded_amount is distinct from old.refunded_amount then
    raise exception 'Financial fields are server-managed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_order_item_financials_trg on public.order_items;
create trigger protect_order_item_financials_trg
before update on public.order_items
for each row execute function public.protect_order_item_financials();

-- Refund state changes are also server/admin managed.
create or replace function public.protect_return_refund_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_service boolean := coalesce(auth.role(), '') = 'service_role';
  is_admin boolean := exists (
    select 1 from public.user_roles ur
    where ur.user_id = auth.uid() and ur.role = 'admin'
  );
begin
  if is_service or is_admin then return new; end if;
  if new.status is distinct from old.status then
    raise exception 'Return status is server-managed';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_return_refund_state_trg on public.return_requests;
create trigger protect_return_refund_state_trg
before update on public.return_requests
for each row execute function public.protect_return_refund_state();
