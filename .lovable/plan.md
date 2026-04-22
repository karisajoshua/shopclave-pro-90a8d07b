

# Update "Top in Electronics" and "Fashion Deals" thumbnails

Replace the 8 Unsplash thumbnail URLs with the user-uploaded images for these two cards on the homepage hero section.

## Steps

1. Copy the 8 uploaded images into `src/assets/` so they're bundled and optimized:
   - `Smartphones.jpeg` → `src/assets/cat-smartphones.jpg`
   - `Laptops.jpeg` → `src/assets/cat-laptops.jpg`
   - `Headphones.jpeg` → `src/assets/cat-headphones.jpg`
   - `Smart_TVs.jpeg` → `src/assets/cat-smart-tvs.jpg`
   - `Men_s_fashion.jpeg` → `src/assets/cat-mens-fashion.jpg`
   - `Women_s_Fashion.jpeg` → `src/assets/cat-womens-fashion.jpg`
   - `Kids_fashion.jpeg` → `src/assets/cat-kids-fashion.jpg`
   - `Shoes.jpeg` → `src/assets/cat-shoes.jpg`

2. Edit `src/components/marketplace/HeroBanner.tsx`:
   - Add 8 ES6 imports for the new assets at the top.
   - Replace the `image:` URLs in the `"Top in Electronics"` block (lines 32–35) and the `"Fashion Deals"` block (lines 42–45) with the imported variables.

## Out of scope
- Other category cards (Home, Health & Beauty, Sports, Phones & Tablets) — unchanged.
- No layout, sizing, or styling changes.
- No DB or category record changes.

