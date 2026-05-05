## Problem

When a signed-out user scans the store QR code (or visits `/store/<slug>` directly), the page shows **"Store not found"**.

Root cause confirmed by hitting the API directly as `anon`:

```
GET /rest/v1/vendors?select=*&slug=eq.barakaz
→ 42501 "permission denied for table vendors"
```

A previous security migration revoked anon's blanket SELECT on `vendors` and re-granted only the safe columns (everything except `payment_details`). But `VendorStorePage.tsx` (and `ProductDetailPage.tsx` joins) still request `select=*`, which includes `payment_details`. PostgREST returns 403 → React Query gets `null` → page shows the empty state.

So the QR code itself is fine; the storefront just refuses to load for guests.

## Fix

Replace `select("*")` with an explicit list of the columns anon is already granted, in the two public-facing queries:

### 1. `src/pages/VendorStorePage.tsx` (line ~51)

Change:
```ts
.from("vendors").select("*")
```
to:
```ts
.from("vendors").select(
  "id, user_id, store_name, store_description, logo_url, banner_url, status, slug, phone, phone2, whatsapp, website, created_at, updated_at"
)
```

`payment_details` is not needed on the storefront — it's only used in checkout (where the user is authenticated).

### 2. `src/pages/ProductDetailPage.tsx` (line ~270)

Already uses an explicit nested select (`vendors(id, slug, store_name, phone, phone2, website, whatsapp)`), but verify nothing else fans out to `payment_details` for guests. No change expected here unless audit reveals one.

### 3. UX guard — gate contact info, not the store itself

`VendorStorePage` already masks phone numbers and forces sign-in for the call/WhatsApp/website actions, so once the page loads, guest privacy rules are still enforced. No change needed.

### 4. Apex domain redirect

`https://barakaz.com` (apex) actually serves the React app correctly — the previous "302 loop" theory was wrong. The QR code's `https://www.barakaz.com/store/<slug>` will work as soon as the column-grant fix lands. No domain/DNS change needed.

## Files Changed

- `src/pages/VendorStorePage.tsx` — narrow vendor SELECT to columns granted to `anon`.

## Verification

After applying:
1. Open `https://www.barakaz.com/store/barakaz` in an incognito window → store loads.
2. Scan the printed QR → store loads.
3. Confirm phone numbers still appear masked and contact buttons still redirect to `/auth` for guests.

## Out of Scope

- No DB migration needed; current grants are correct.
- No QR code regeneration — existing QR codes will start working immediately.
