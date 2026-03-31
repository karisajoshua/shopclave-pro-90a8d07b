

# Plan: Product Page Enhancements, Location Detection, and Reviews

## Summary
Four changes: (1) Add "Buy Now" button to product pages, (2) Redesign product detail page to match the uploaded reference (Amazon-style layout), (3) Fix location detection using IP-based geolocation instead of timezone, (4) Add verified buyer review system to product pages.

---

## 1. Add "Buy Now" Button to Product Detail Page

**File: `src/pages/ProductDetailPage.tsx`**
- Add a "Buy Now" button below (or beside) the "Add to Cart" button
- "Buy Now" adds the item to cart and navigates directly to `/checkout`
- Style it with a distinct look (e.g., orange/warning background) to differentiate from "Add to Cart"

## 2. Redesign Product Detail Page (Amazon-style)

**File: `src/pages/ProductDetailPage.tsx`**
Based on the reference PDF, restructure the page to include:
- Breadcrumb navigation at the top
- Product title more prominent with brand/vendor link
- Rating stars with clickable review count (scrolls to reviews section)
- Price section with discount percentage badge when compare_at_price exists
- Delivery info section showing user's detected country
- Variant selectors styled as visual chips (color swatches where applicable)
- "Add to Cart" + "Buy Now" buttons stacked or side-by-side
- Stock availability indicator
- Product details/description in a tabbed or accordion section
- Reviews section at the bottom

## 3. Fix Location Detection (IP-based Geolocation)

**File: `src/hooks/useLocale.ts`**
- Current approach uses `Intl.DateTimeFormat().resolvedOptions().timeZone` which has a limited mapping and misses many countries (e.g., Canada)
- Replace with a free IP geolocation API call (e.g., `https://ipapi.co/json/` or `https://ip-api.com/json/`) to detect the user's actual country
- Fall back to timezone-based detection if the API call fails
- Cache the result in localStorage to avoid repeated API calls

## 4. Verified Buyer Review System on Product Pages

**Database**: The `reviews` table already exists with RLS policies that restrict reviews to purchasers of delivered orders. A unique constraint on `(user_id, product_id)` is needed if not already present.

**Migration needed**: Add unique constraint on `reviews(user_id, product_id)` if missing.

**File: `src/pages/ProductDetailPage.tsx`** (or new component `src/components/product/ProductReviews.tsx`)
- Fetch reviews for the current product with user profile info (full_name, avatar_url)
- Display average rating and rating breakdown (5-star bar chart)
- Show individual reviews with star rating, comment, date, and "Verified Purchase" badge
- If the logged-in user has a delivered order for this product and hasn't reviewed yet, show a review form (star picker + text area)
- The existing RLS policy already enforces verified-purchase-only inserts

## 5. Vendor Variant Image Assignment (Clarification)

The current vendor "Add Product" page already supports defining variant option types (Color, Size, etc.) with values, and auto-generates variant combinations with individual price/stock/SKU fields. The variants system already works — each variant combination appears as a row. No structural changes needed to the vendor form; the existing flow handles the described use case (uploading 3 belt types with different colors/sizes).

---

## Technical Details

### Files to Create
- `src/components/product/ProductReviews.tsx` — Review display + submission component

### Files to Modify
- `src/pages/ProductDetailPage.tsx` — Add Buy Now button, redesign layout, integrate reviews
- `src/hooks/useLocale.ts` — Switch to IP-based geolocation with fallback

### Database Migration
- Add unique constraint: `ALTER TABLE reviews ADD CONSTRAINT reviews_user_product_unique UNIQUE (user_id, product_id);` (if not already present)

### Dependencies
- No new packages needed; uses existing `react-query`, `sonner`, `lucide-react`, `recharts` (for rating bars)

