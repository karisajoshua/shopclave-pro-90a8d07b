## Issue

Clicking a product shows "Product not found" because the product detail query fails with HTTP 401:

```
permission denied for table vendors
```

The product detail page selects products joined with `vendors(...)`. PostgREST requires a table-level `SELECT` grant on every embedded table — not just an RLS policy. On this project the `vendors` table has had `SELECT` revoked from the `anon` role (current ACL: `awdDxtm` — no `r`), even though the RLS policy "Anon can view vendor public info" exists. So any anonymous request that embeds `vendors` (product detail, product cards, store pages, search) returns 401.

## Fix

Single migration that restores the missing grants on `public.vendors`:

```sql
GRANT SELECT ON public.vendors TO anon;
GRANT SELECT ON public.vendors TO authenticated;
```

`authenticated` is included defensively (it currently has SELECT, but this keeps the grant explicit and idempotent). RLS still controls which rows are returned.

## Verification

1. Reload the failing product page in the preview — should render product detail instead of "Product not found".
2. Confirm homepage product cards and vendor store pages also render vendor info for signed-out users.

## Out of scope

- No code changes to `ProductDetailPage.tsx`, the wishlist feature, or RLS policies.
- Not touching other tables — their ACLs already include `r` for `anon`.
