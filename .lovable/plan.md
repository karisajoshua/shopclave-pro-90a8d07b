# Shippo: Live shipping rates at checkout

Use one platform-level Shippo API key (Barakaz account) to fetch live carrier rates per vendor shipment at checkout, before the buyer pays. Origin = each vendor's existing `warehouse_address`. Destination = buyer's shipping address.

No label purchasing, no tracking, no address validation in this scope — those tables/columns already exist on `order_items` and can be added later.

## Prerequisites (user action)

1. Create a Shippo account at goshippo.com and grab a Live API token (Settings → API).
2. I'll request it via the secrets tool as `SHIPPO_API_TOKEN` once you approve this plan.
3. Each vendor must fill in their `warehouse_address` (street, city, state, zip, country) in Vendor Settings — used as the ship-from address. I'll add inline UI hints + a "Shipping origin required" warning on the dashboard if missing.
4. Each product needs `weight_g` and `length_cm/width_cm/height_cm` (already in schema) — Shippo requires parcel dimensions. I'll surface defaults (e.g. fallback to 500 g, 20×15×10 cm) so existing products without dimensions still get rates.

## What gets built

### 1. Edge function: `get-shipping-rates`
- Input: `{ items: [{product_id, quantity, variant_id?}], shipping_address: {...} }`
- Validates input with Zod.
- Groups items by `vendor_id` (each vendor = separate Shippo shipment).
- For each vendor:
  - Loads vendor `warehouse_address` (returns error if missing).
  - Builds a parcel from product weights & dimensions (sums weight, takes max bounding box; fallback defaults if missing).
  - Calls Shippo `POST /shipments` with `address_from`, `address_to`, `parcels`, `async: false`.
  - Picks the cheapest rate per service level (or returns top 3 cheapest) — returns `{vendor_id, store_name, rates: [{object_id, provider, service, amount, currency, estimated_days}]}`.
- Returns aggregated `{ vendors: [...], total_shipping }`.
- Uses CORS headers, validates JWT in code.

### 2. Frontend: Checkout shipping step
- New step in `CheckoutPage.tsx` between Address and Payment: **"Shipping"**.
- After buyer enters the address, call `supabase.functions.invoke('get-shipping-rates', ...)`.
- For each vendor, show a radio list of carrier options (USPS / DHL / etc. with price + ETA).
- Buyer picks one rate per vendor → store `{vendor_id: shipping_rate_id}` map in checkout state.
- Order total = subtotal + sum of selected shipping amounts (replaces the hard-coded `deliveryFee = 200`).

### 3. `create-order` edge function update
- Accept new `shipping_selections: [{vendor_id, rate_id, amount, carrier, service}]` in payload.
- Persist on each `order_items` row: `shipping_rate_id`, `shipping_amount`, `carrier` (already in schema).
- Persist `shipping_total` on `orders` (already in schema).
- Email template gets a "Shipping" line per vendor.

### 4. Vendor settings warning
- In `VendorSettings.tsx`, if `warehouse_address` is incomplete, show a warning banner: "Add your shipping origin address so buyers can see live shipping rates for your products."

## Technical details

- Shippo API base: `https://api.goshippo.com`
- Auth header: `Authorization: ShippoToken <SHIPPO_API_TOKEN>`
- Endpoint: `POST /shipments` with `async: false` returns `rates[]` synchronously (1-3 s typical).
- Weight unit: `g`; distance unit: `cm` (matches our existing product columns).
- Each `rate.object_id` is what we store as `shipping_rate_id` — required if we later add label purchase.
- No DB schema changes needed — all required columns already exist on `vendors`, `products`, `order_items`, `orders`.
- Rate caching: skip in v1; Shippo allows ~5 req/sec which is fine for checkout traffic.

## Out of scope (future)

- Label purchase (`POST /transactions` using stored `shipping_rate_id` → fills `shippo_transaction_id`, `label_url`, `tracking_number`).
- Webhook `track_updated` → auto-update `order_items.status` to `shipped`/`delivered`.
- Address validation (`POST /addresses` with `validate: true`).
- Per-vendor Shippo accounts.

After you approve, I'll request the `SHIPPO_API_TOKEN` secret and implement.
