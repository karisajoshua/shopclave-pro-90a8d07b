

## Product Variations System

### Overview
Add a product variants system so vendors can define options like Size, Color, Material etc. for their products, each variant combination having its own price, stock, and SKU.

### Database Changes

**New table: `product_variants`**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid (PK) | |
| product_id | uuid (FK) | References products |
| variant_options | jsonb | e.g. `{"Size": "42", "Color": "Red"}` |
| price | numeric | Override price (nullable, falls back to product price) |
| stock | integer | Stock for this specific variant |
| sku | text | Optional SKU |
| created_at | timestamptz | |

**RLS policies:** Same pattern as products -- viewable by everyone, manageable by owning vendor and admins.

### UI Changes

**1. AddProductPage (vendor) -- Add variants section**
- Toggle: "This product has variations"
- When enabled, vendor can define option types (e.g. "Size", "Color") and their values (e.g. "S, M, L, XL")
- Auto-generates variant rows from combinations
- Each variant row shows the option values with editable price override and stock fields
- The main product stock/price become defaults

**2. ProductDetailPage (customer) -- Variant selection**
- Show dropdowns/buttons for each option type (Size picker, Color swatches)
- Update displayed price and stock based on selected variant
- Pass selected variant info to cart

**3. CartContext -- Support variant info**
- Add optional `variantId` and `variantLabel` to `CartItem` interface
- Cart deduplication uses `productId + variantId` combo

**4. VendorProducts -- Show variant count**
- Display variant count badge next to products that have variants

**5. CheckoutPage / Order flow**
- Store variant details in order_items (add `variant_id` and `variant_options` columns to `order_items`)

### Implementation Order
1. Create database migration (product_variants table + order_items columns)
2. Update AddProductPage with variant builder UI
3. Update ProductDetailPage with variant selectors
4. Update CartContext to handle variants
5. Update checkout/order flow to persist variant selections

