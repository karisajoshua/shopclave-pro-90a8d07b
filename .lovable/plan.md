

# Independent Product Fields + Edit Form Wizard + Auto-SKU

## Problem Summary
1. Key Features are parsed from the description text — editing description removes features
2. Edit Product form is a basic single-page form, not matching the new multi-step Add Product wizard
3. Products have no SKU column — need to add one with auto-generation

## Changes

### 1. Database Migration — Add columns to `products` table
Add four new columns:
- `sku` (text, nullable) — auto-generated if not provided
- `key_features` (text[], nullable) — independent array of feature strings  
- `condition` (text, default `'new'`) — New/Used
- `whats_in_box` (text, nullable) — independent from description

Also generate SKUs for all 19 existing products using a pattern like `SKU-{first 3 chars of name uppercased}-{short random}`.

### 2. Update `AddProductPage.tsx`
- Add `key_features` input (multi-line, one feature per line or add/remove UI)
- Add `whats_in_box` text input
- Save `sku`, `key_features`, `condition`, `whats_in_box` to the new columns on submit
- Auto-generate SKU if vendor doesn't provide one (e.g., `SKU-{timestamp-short}`)

### 3. Rewrite `EditProductPage.tsx` as Multi-Step Wizard
- Match the same 6-step structure as `AddProductPage`: Category → Details → Pricing → Media → Variants → Review
- Pre-populate all fields from the existing product data
- Include cascading category dropdowns, key features editor, condition, whats_in_box
- Keep existing variant editing logic but restructure into the step format

### 4. Update `ProductDescriptionTabs.tsx`
- Read `key_features` from `meta` prop (from database) instead of parsing from description
- Read `whats_in_box` from `meta` prop instead of hardcoding
- Read `condition` and `sku` from `meta` prop

### 5. Update `ProductDetailPage.tsx`
- Pass the new fields (`key_features`, `condition`, `sku`, `whats_in_box`) from the product query into the `meta` prop

## SKU Auto-Generation Logic
Pattern: `SKU-{CATEGORY_PREFIX}-{TIMESTAMP_SHORT}`  
Example: `SKU-ELC-7K3X2` (for Electronics category)  
If no category: `SKU-GEN-7K3X2`

## Files to modify
- **Migration**: Add `sku`, `key_features`, `condition`, `whats_in_box` columns; backfill SKUs for existing products
- `src/pages/vendor/AddProductPage.tsx` — Add key features, whats_in_box, condition fields; auto-generate SKU; save new columns
- `src/pages/vendor/EditProductPage.tsx` — Full rewrite as multi-step wizard matching AddProductPage
- `src/components/product/ProductDescriptionTabs.tsx` — Read features/condition/sku/whats_in_box from meta instead of parsing description
- `src/pages/ProductDetailPage.tsx` — Pass new fields to ProductDescriptionTabs meta prop

