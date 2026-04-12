

# Plan: Pivot to Jiji-Style Listing/Classifieds Business Model

## Summary
Transform the marketplace from a transactional model (platform handles orders/payments) to a **listing/classifieds model** where vendors pay subscription fees for visibility, handle their own orders/logistics/payments, and customers contact vendors directly. The platform earns from vendor listing fees, not transaction commissions.

---

## Hero Banner Size

The current hero banner renders at **full container width** (max ~1280px) with padding. The actual visible area is:
- **Desktop**: approximately **1200 x 400 pixels** (safe area for text/imagery)
- **Mobile**: approximately **375 x 280 pixels**

**Recommended banner image size**: **1400 x 450px** (2x for retina: **2800 x 900px**). This gives enough bleed for all screen sizes. We will update the hero to support actual uploaded banner images instead of just gradients.

---

## 1. Database Changes

### Add vendor contact fields
```sql
ALTER TABLE public.vendors
  ADD COLUMN phone text,
  ADD COLUMN phone2 text,
  ADD COLUMN website text,
  ADD COLUMN whatsapp text;
```

### Create subscription plans table
```sql
CREATE TABLE public.vendor_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  plan_name text NOT NULL DEFAULT 'free',
  max_listings integer NOT NULL DEFAULT 5,
  price numeric NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_subscriptions ENABLE ROW LEVEL SECURITY;
-- Vendors can read their own, admins can read all
```

### Create vendor_views tracking table (for admin stats)
```sql
CREATE TABLE public.vendor_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  event_type text NOT NULL DEFAULT 'view',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.vendor_analytics ENABLE ROW LEVEL SECURITY;
-- Anyone can insert (track views), vendors see own, admins see all
```

## 2. Remove Cart/Checkout Flow from Product Pages

**File: `src/pages/ProductDetailPage.tsx`**
- Replace "Add to Cart" and "Buy Now" buttons with **"Contact Seller"** buttons: Call, WhatsApp, Website link
- Show vendor phone number, WhatsApp, website prominently on the product page
- Remove the floating mobile buy bar, replace with floating "Call Seller" / "WhatsApp" bar
- Track product views by inserting into `vendor_analytics`

## 3. Vendor Settings: Add Contact Info

**File: `src/pages/vendor/VendorSettings.tsx`**
- Add fields: Phone, Phone 2, WhatsApp number, Website URL
- These are saved to the new vendor columns

## 4. Vendor Registration: Collect Contact Info

**File: `src/pages/VendorRegisterPage.tsx`**
- Add phone number (required) and optional website/WhatsApp fields during registration

## 5. Admin Vendor Analytics Dashboard

**File: `src/pages/admin/AdminVendors.tsx`** (enhance)
- Show per-vendor stats: total product views, total contact clicks, listing count, subscription status
- Query from `vendor_analytics` table

**File: `src/pages/admin/AdminSubscriptions.tsx`** (new)
- Manage subscription plans and vendor subscription status
- View which vendors are on which plans, expiry dates

## 6. Vendor Dashboard Updates

**File: `src/pages/vendor/VendorDashboard.tsx`**
- Replace revenue/commission metrics with: Product Views, Contact Clicks, Active Listings vs Max Listings, Subscription Status
- Show subscription expiry warning

## 7. Hero Banner: Support Custom Images

**File: `src/components/marketplace/HeroBanner.tsx`**
- Update slides to support an optional `image` field (URL) that renders as a full-width background image instead of a gradient
- Admin can set banner images via platform settings

## 8. Cleanup

- Remove or hide the cart-based checkout flow references where they conflict with the new model (keep the cart system intact as it may be useful later, but hide "Add to Cart" on product pages)
- The existing orders/order_items tables stay for potential future use but are not exposed in the new vendor flow

---

## Files to Create
- `src/pages/admin/AdminSubscriptions.tsx`

## Files to Modify
- `src/pages/ProductDetailPage.tsx` — Contact seller buttons, remove buy flow, track views
- `src/pages/vendor/VendorSettings.tsx` — Add contact fields
- `src/pages/VendorRegisterPage.tsx` — Add phone/WhatsApp fields
- `src/pages/vendor/VendorDashboard.tsx` — Listing-model metrics
- `src/pages/admin/AdminVendors.tsx` — Per-vendor analytics
- `src/components/marketplace/HeroBanner.tsx` — Support banner images
- `src/App.tsx` — Add subscription admin route
- `src/components/admin/AdminSidebar.tsx` — Add Subscriptions nav item

## Database Migration
- Add columns to `vendors` table (phone, phone2, website, whatsapp)
- Create `vendor_subscriptions` table
- Create `vendor_analytics` table

