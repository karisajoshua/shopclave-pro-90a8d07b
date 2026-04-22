

# Fix: Show size chart only for clothing products

## Problem
The "View Size Chart" button currently appears for ALL products in the Fashion category, including bags, shoes, jewelry, and accessories — items that don't need bust/waist measurements. This creates confusion for buyers.

## Root cause
The current check at line 618-619 only verifies if the product is in Fashion category:
```tsx
{(product.category_id === FASHION_CATEGORY_ID ||
  (product as any).categories?.parent_id === FASHION_CATEGORY_ID) && ...
```

This includes non-clothing subcategories like Bags & Luggage, Handbags, Jewelry, Men's Accessories, Men's Shoes, and Women's Shoes.

## Fix
Modify `src/pages/ProductDetailPage.tsx` to exclude non-clothing categories by checking if the category name contains "bag", "shoe", "jewelry", or "accessories" (case-insensitive).

**New condition:**
```tsx
{(() => {
  const isFashionCategory = product.category_id === FASHION_CATEGORY_ID ||
    (product as any).categories?.parent_id === FASHION_CATEGORY_ID;
  const categoryName = (product as any).categories?.name?.toLowerCase() || '';
  const isNonClothing = /bag|shoe|jewelry|accessories|luggage/.test(categoryName);
  return isFashionCategory && !isNonClothing;
})() && (
  <Dialog>...</Dialog>
)}
```

This keeps the size chart visible for:
- Men, Women, Kids, Traditional Wear (clothing)
- Any other fashion subcategories that might be added later

And hides it for:
- Bags & Luggage, Handbags
- Men's Shoes, Women's Shoes  
- Jewelry
- Men's Accessories

## Files touched

```text
src/pages/ProductDetailPage.tsx
  - Replace lines 617-724 (Size Chart section) with updated condition
```

## Out of scope
- No database changes
- No changes to other product types
- The size chart content/tables remain unchanged

