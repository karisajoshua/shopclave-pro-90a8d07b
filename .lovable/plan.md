# Seller product listing: 6-step flow matching the designs

Steps: Category → Details → Pricing → Media → Variants → Review, shared by Add and Edit product pages. Stepper, cards, orange primary buttons, Back/Next footer, all stacking cleanly on mobile.

## What each step contains
1. **Category** – existing 3-level picker (incl. Workwear & Safety).
2. **Details** – name, brand, model/MPN, condition, description (850-char counter), key features and what's-in-the-box as reorderable rows with Add/remove.
3. **Pricing** – price, compare-at, cost per item (seller-only), bulk price; SKU (auto-generated if blank), barcode/GTIN, stock, track inventory, low-stock alert, allow backorders, min/max order qty; package weight/L/W/H (required); shipping options table: Standard, Express, Free Shipping, Local Pickup, each with enable box, delivery-time choice and CA$ price (Free/Pickup = CA$0); flash-sale end time.
4. **Media** – drag-and-drop up to 10 images (JPG/PNG/WebP, 5 MB), reorder, choose main image; optional YouTube/Vimeo link, validated.
5. **Variants** – toggle; option types (Size, Colour, custom) with value chips; auto-built combinations table with image, SKU, price, compare-at, stock, delete, bulk "Apply to all", auto SKU.
6. **Review** – summary cards (Details + image strip, Pricing & Inventory, Variants table, Shipping, Seller, Status) each with Edit jumping to that step; **Save as Draft** and **Publish Product**.

Drafts save with partial validation; Publish requires every required field.

## Synchronization
- **Product page**: brand/MPN in specifications, per-variant price/stock/image already used; delivery panel shows only the seller's enabled options with their prices/times; Local Pickup shown when enabled.
- **Checkout**: enabled options and seller prices feed the per-seller delivery choice; min/max quantity and backorder rules enforced in cart and server order creation. Backorders stay off in checkout unless explicitly enabled (stock can't go negative otherwise).
- **Seller dashboard**: products list shows Draft/Active, SKU, low-stock badge by seller threshold.
- **Admin dashboard**: products table shows brand, SKU, status, shipping options.

## Technical details
- Additive migration on `products`: `brand`, `mpn`, `barcode`, `cost_per_item` (hidden from public via column-safe reads), `low_stock_threshold`, `track_inventory` (default true), `allow_backorders` (default false), `min_order_qty` (default 1), `max_order_qty`, `shipping_options jsonb` (default Standard 12.50/3–7 + Express 19.99/1–3). `product_variants` gets `barcode`. No existing data changed.
- One shared `ProductListingWizard` component used by AddProductPage and EditProductPage; step validators in `src/lib/productListing.ts` with tests.
- Shipping server functions read `shipping_options` for price/eligibility; server remains authoritative — client values are never trusted.
- Nothing published or deployed without your go-ahead.

## Needs your confirmation
Seller-set shipping prices will replace the fixed CA$12.50 / CA$19.99 at checkout for that product. Approving this plan confirms that change.
