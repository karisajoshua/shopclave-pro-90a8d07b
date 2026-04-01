

# Plan: Product Page Redesign, Social Sharing, Seller Follow, and Checkout Overhaul

## Summary
Fix the blank screen bug on Add to Cart / Buy Now, redesign the product page to a 3-column layout (gallery+description left, buy box center, seller info right), add social sharing, implement a seller follow system with follower counts, and redesign checkout to a stepped flow like the Jumia reference.

---

## 1. Fix Blank Screen on Buy Now / Add to Cart

**Root cause**: The `handleBuyNow` calls `addItem` in a loop then immediately `navigate("/checkout")`. React batches the `setItems` calls, so when CheckoutPage mounts, `items` may still be empty, triggering `navigate("/cart")` which shows an empty cart page (appears blank). Also, the CheckoutPage does `navigate("/cart")` and `navigate("/auth")` during render (not in useEffect), causing render-time side effects.

**Fix**:
- In `ProductDetailPage.tsx`: Change `handleBuyNow` to call `addItem` once with the correct quantity rather than looping, and use a small timeout or pass state via navigate
- In `CheckoutPage.tsx`: Move the redirect logic into `useEffect` to prevent render-time navigation. Add a loading state while checking.
- In `CartContext.tsx`: Add a `addItemWithQuantity` method that accepts quantity parameter to avoid the loop issue

## 2. Redesign Product Page Layout (3-Column)

**File: `src/pages/ProductDetailPage.tsx`**

New layout: `grid lg:grid-cols-[1fr_340px_300px]`
- **Left column**: Product gallery + description below it + reviews
- **Center column**: Title, rating, price, variant selectors, quantity, Add to Cart, Buy Now buttons
- **Right column** (like reference image):
  - "Delivery & Returns" section with user's detected country
  - Seller Information card with store name, follower count, "Follow" button
  - Seller Performance metrics (derived from review averages)
  - Social sharing buttons

## 3. Social Media Sharing

**In `ProductDetailPage.tsx`**:
- Add share buttons for WhatsApp, Facebook, Twitter/X, and copy link
- Use native `navigator.share()` on mobile as fallback
- Generate share URL from `window.location.href`
- No external packages needed — use direct share URLs (e.g., `https://wa.me/?text=...`, `https://twitter.com/intent/tweet?url=...`)

## 4. Seller Follow System

**Database migration**:
```sql
CREATE TABLE public.vendor_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vendor_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, vendor_id)
);
ALTER TABLE public.vendor_follows ENABLE ROW LEVEL SECURITY;

-- Users can see their own follows
CREATE POLICY "Users can view own follows" ON public.vendor_follows
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Users can follow vendors
CREATE POLICY "Users can follow vendors" ON public.vendor_follows
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can unfollow
CREATE POLICY "Users can unfollow" ON public.vendor_follows
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Public follower count function
CREATE OR REPLACE FUNCTION public.get_vendor_follower_count(v_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::integer FROM public.vendor_follows WHERE vendor_id = v_id;
$$;
```

**Product page**: Show follower count and Follow/Unfollow button in seller info section.

**Vendor dashboard**: Show follower count on the vendor dashboard header and VendorDashboard page.

## 5. Checkout Page Redesign (Stepped Flow)

**File: `src/pages/CheckoutPage.tsx`**

Redesign to match the Jumia reference with 3 steps:
1. **Customer Address** — Show saved address or form to enter, with "Change" button
2. **Delivery Details** — Show delivery estimate, shipment items grouped by vendor
3. **Payment Method** — M-Pesa, Card, COD options

Right sidebar: **Order Summary** with item totals, delivery fees, total, and "Confirm Order" button.

Move redirect logic to `useEffect`. Pre-fill address from `addresses` table if user has a saved address.

## 6. Vendor Edit Products (Already Implemented)

The edit functionality already exists (`EditProductPage.tsx` with route `/vendor/products/edit/:id` and edit buttons in `VendorProducts.tsx`). No changes needed — will verify it works correctly.

---

## Technical Details

### Files to Create
- None (all changes in existing files)

### Files to Modify
- `src/pages/ProductDetailPage.tsx` — 3-column layout, social sharing, seller info, follow button
- `src/pages/CheckoutPage.tsx` — Stepped flow redesign
- `src/contexts/CartContext.tsx` — Add `addItemWithQuantity` method
- `src/components/vendor/VendorLayout.tsx` — Show follower count in header
- `src/pages/vendor/VendorDashboard.tsx` — Show follower count

### Database Migration
- Create `vendor_follows` table with RLS
- Create `get_vendor_follower_count` function

### No New Dependencies
- Social sharing uses direct URL schemes
- All UI built with existing shadcn components

