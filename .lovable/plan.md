

# Product Description Tabs + Multi-Step Add Product Form

## Part 1: Product Detail — Subdivided Description Section

Currently, the description is rendered as a single `<p>` block. Replace it with a tabbed section containing:

- **Description** — the product description text
- **Specifications** — parsed from description or a future dedicated field; for now show key-value pairs if the description contains structured data, otherwise show a "No specifications" placeholder
- **Reviews** — move the existing `ProductReviews` component into this tab
- **Shipping & Returns** — static info about delivery and return policy

Implementation: Create a `ProductDescriptionTabs` component using the existing `Tabs` UI component. Use it in both the desktop and mobile description blocks in `ProductDetailPage.tsx`.

### Files
- `src/components/product/ProductDescriptionTabs.tsx` — new component with 4 tabs
- `src/pages/ProductDetailPage.tsx` — replace the description `<div>` blocks with the new tabs component; move reviews into the tabs

---

## Part 2: Multi-Step Add Product Form with Cascading Categories

Replace the current single-page `AddProductPage` with a multi-step wizard:

### Step 1: Category Selection (cascading dropdowns)
- Level 1: Show top-level categories (parent_id is null) — e.g., Electronics, Fashion, Automotive
- Level 2: After L1 selection, load children of that category
- Level 3: After L2 selection, load children of L2 (if any exist)
- Each level only appears after the previous is selected
- Visual breadcrumb of selected path: "Automotive > Car Parts > Tyres"

### Step 2: Product Details (dynamic based on category)
- Product Name*, Description* (with 850 char counter), Condition (New/Used)
- Category-specific fields based on selected category (future extensibility — for now, show common fields)
- Make/Brand dropdown (if applicable)

### Step 3: Pricing & Stock
- Price*, Compare at Price, Bulk Price (expandable optional section)
- Stock Quantity, SKU
- Delivery options dropdown

### Step 4: Images & Media
- Multi-image upload (existing logic)
- Video URL input
- Image reordering

### Step 5: Variants (optional)
- Toggle to enable variants
- Existing variant option types + auto-generated rows logic (keep current implementation)

### Step 6: Review & Submit
- Summary of all entered data
- Seller info (pre-filled from vendor profile): name, phone
- Status selection (Active/Draft)
- "Post Ad" button (green, full width)

### Navigation
- Step indicator bar at the top showing progress
- Next/Back buttons
- Validation per step before allowing next
- Mobile-first responsive layout

### Files
- `src/pages/vendor/AddProductPage.tsx` — full rewrite as multi-step form
- No database changes needed — uses existing `categories` table with `parent_id` for hierarchy

## Technical Notes
- Categories already have a `parent_id` column supporting the 3-level hierarchy
- The cascading dropdown queries `categories` filtered by `parent_id`
- Character counter on description uses controlled input with `maxLength={850}`
- Step state managed with `useState` for current step index
- Each step is a separate section rendered conditionally
- Form data accumulated across steps in a single state object

