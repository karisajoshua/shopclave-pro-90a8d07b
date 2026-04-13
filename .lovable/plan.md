

# Fix: Contact Seller Not Rendering — RLS Policy Missing

## Root Cause
The `vendors` table has Row-Level Security policies that only allow admins and vendor owners to read vendor data. When a signed-out user (or regular customer) visits a product page, the Supabase join `vendors(...)` returns `null` because RLS blocks the read. This makes `vendor` falsy, so `{vendor && <SellerInfoSidebar ... />}` renders nothing.

## Fix

### 1. Add a public read policy on the `vendors` table
Create a migration that adds a SELECT policy allowing anyone (authenticated or anonymous) to read vendor records. This is appropriate because store name, phone, and other contact info are meant to be publicly visible on product pages.

```sql
CREATE POLICY "Anyone can view vendors"
ON public.vendors
FOR SELECT
TO anon, authenticated
USING (true);
```

### 2. No code changes needed
The existing `ProductDetailPage.tsx` code already handles the display correctly — it masks phone numbers for signed-out users and gates actions behind auth. The only issue is the missing RLS policy preventing the data from loading.

## Technical Detail
- The product query at line 264 does `select("*, vendors(...)")` which performs a join
- Supabase applies RLS on the joined table too, so if the user's role can't read `vendors`, the join returns null
- Adding the public read policy fixes this for all product pages globally

