# Flash Sale & Best Deals Feature

## Concept

A product becomes a **Flash Sale** item automatically the moment a vendor (or admin) sets a `deal_ends_at` timestamp in the future. No new tables — we reuse the existing `products.deal_ends_at` column already used by countdown badges.

Two new homepage sections appear directly under "Sponsored Products":

1. **Flash Sale** — active products where `deal_ends_at > now()`, ordered by soonest-ending first. Includes a live countdown badge on each tile.
2. **Best Deals** — active products with the highest discount percentage (`(compare_at_price - price) / compare_at_price`), regardless of timer.

Both sections render as a **2-row × 5-tile grid (10 products max)** on desktop, gracefully collapsing to 2 cols on mobile.

## Vendor side: setting the timer

Today, only Admin can set `deal_ends_at` (in `AdminProducts.tsx`). We will:

- Add a "Flash Sale Timer" field to the vendor **Add Product** and **Edit Product** wizards on the Pricing step (date-time picker + "Clear" button).
- When set, save `deal_ends_at` on the product. The product is then automatically considered a Flash Sale item — no extra flag needed.
- Show a small "⚡ Flash Sale" pill in the vendor product list when a future timer is set.

## Homepage sections

In `src/pages/Index.tsx`, between `<PromoStrip />` and the existing Featured section, add:

```text
┌─ Flash Sale ──────────── ends in 02:14:33 ⚡ ──┐
│  [tile][tile][tile][tile][tile]                │
│  [tile][tile][tile][tile][tile]                │
└────────────────────────────────────────────────┘
┌─ Best Deals ─────────────────── view all → ────┐
│  [tile][tile][tile][tile][tile]                │
│  [tile][tile][tile][tile][tile]                │
└────────────────────────────────────────────────┘
```

Each section:
- Hidden if zero results.
- Grid: `grid-cols-2 sm:grid-cols-3 md:grid-cols-5` with `gap-4`, capped at 10 items.
- Reuses existing `ProductCard` (already supports `dealEndsAt` countdown + discount badge).

### Sponsored products integration

You also said "some of these products will show on the homepage under Sponsored Products". The existing PromoStrip's "Sponsored Products" placement is admin-curated (`promotions` table). No DB change is needed — admins can already point a sponsored slot to any flash-sale product. We will document this in the admin manual snippet but no code change is required there beyond what already works.

## Technical details

**Files to create**
- `src/components/marketplace/FlashSaleSection.tsx` — queries products with `deal_ends_at > now()`, ordered ascending by `deal_ends_at`, limit 10. Shows a single header-level countdown to the soonest-ending item.
- `src/components/marketplace/BestDealsSection.tsx` — queries active products having `compare_at_price > price`, computes discount client-side, sorts desc, limit 10.

**Files to edit**
- `src/pages/Index.tsx` — render the two new sections after `<PromoStrip />`.
- `src/pages/vendor/AddProductPage.tsx` — add `dealEndsAt` state + datetime input on Pricing step, include in insert payload.
- `src/pages/vendor/EditProductPage.tsx` — same field, populated from existing value.
- `src/pages/vendor/VendorProducts.tsx` — show "⚡ Flash Sale" pill when `deal_ends_at` is in the future.

**Query shape (Best Deals)**

```ts
supabase.from("products")
  .select("*, vendors(store_name), product_images(url)")
  .eq("status","active")
  .not("compare_at_price","is",null)
  .order("created_at",{ascending:false})
  .limit(40); // then sort by discount % client-side, slice 10
```

**Query shape (Flash Sale)**

```ts
supabase.from("products")
  .select("*, vendors(store_name), product_images(url)")
  .eq("status","active")
  .gt("deal_ends_at", new Date().toISOString())
  .order("deal_ends_at",{ascending:true})
  .limit(10);
```

**RLS / DB**: no changes — `products` already publicly readable when `status='active'`, and vendors can already update their own products (so they can write `deal_ends_at`).

**i18n**: add `home.flashSale`, `home.bestDeals`, `product.flashSaleTimer` translation keys.

## Out of scope
- No automatic price reduction logic — vendors set the discounted `price` and `compare_at_price` themselves; the timer just gates the "Flash Sale" badge.
- No new admin-curated flash-sale list (auto-derived from timer).