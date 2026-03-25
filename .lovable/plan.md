

## Plan: Rebrand to Barakaz + Mega Menu + Enhanced Vendor Dashboard

### Overview
Rename the platform from "ShopZone" to "Barakaz", add the uploaded logo (with transparent background) to navbar/footer, build a full mega menu with the provided category hierarchy, fix the hero "Start Selling" button visibility, and enhance the vendor dashboard with more shop management features.

### Changes

#### 1. Copy Logo & Rebrand
- Copy `user-uploads://Barakaz.png` to `src/assets/barakaz-logo.png`
- Update all "ShopZone" references across the codebase to "Barakaz" (Navbar, Footer, HeroBanner, Index page sell banner, page titles in `index.html`)

#### 2. Navbar with Logo + Mega Menu
- **Navbar.tsx**: Replace text logo with the Barakaz logo image (sized ~36px height). Remove the white background from the image using CSS (`mix-blend-mode` or just relying on the PNG transparency).
- Replace the simple categories bar with a **mega menu** using hover-triggered dropdowns. Each top-level category (Electronics, Fashion, Home & Garden, Health & Beauty, Sports, Phones & Tablets) opens a multi-column dropdown panel showing subcategories and their children as provided.
- On mobile: the mega menu becomes an accordion-style expandable list inside the mobile drawer.
- Create a new component `src/components/layout/MegaMenu.tsx` with the full category data structure and desktop/mobile rendering.

#### 3. Footer Update
- Replace "ShopZone" text with logo image import
- Update all text references to "Barakaz"

#### 4. Hero Banner Fix
- Make the "Start Selling" button more visible by using a contrasting style (e.g., `bg-white text-primary` or `variant="secondary"` with solid background) instead of the semi-transparent outline.

#### 5. Database: Seed Categories
- Create a migration to insert the full category hierarchy (6 top-level categories with subcategories and sub-subcategories) into the `categories` table, using `parent_id` for nesting.

#### 6. Enhanced Vendor Dashboard
Add tabbed sections to VendorDashboard with:
- **Overview tab** (existing stats + recent orders)
- **Products tab** with edit/delete actions, status toggle (active/draft), inline stock editing
- **Orders tab** with full order list, status update buttons (pending → processing → shipped → delivered)
- **Store Settings tab** to edit store name, description, logo URL, banner URL
- **Earnings tab** showing revenue breakdown, commission deducted, net earnings

Also enhance `AddProductPage.tsx` with:
- Category selector (dropdown from categories table)
- Image URL field (text input for now)
- Product status selector (draft/active)

#### 7. Mobile Responsiveness Audit
- Ensure all pages use responsive grid classes
- Vendor dashboard tables become card-based on mobile
- Mega menu works as accordion on mobile

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/assets/barakaz-logo.png` | Copy from uploads |
| `src/components/layout/MegaMenu.tsx` | Create - mega menu component with category data |
| `src/components/layout/Navbar.tsx` | Modify - logo, mega menu integration |
| `src/components/layout/Footer.tsx` | Modify - logo, rebrand |
| `src/components/marketplace/HeroBanner.tsx` | Modify - rebrand, fix button |
| `src/pages/Index.tsx` | Modify - rebrand sell banner |
| `src/pages/vendor/VendorDashboard.tsx` | Major rewrite - tabbed dashboard |
| `src/pages/vendor/AddProductPage.tsx` | Enhance - category, images, status |
| `index.html` | Update title to Barakaz |
| New migration | Seed categories hierarchy |

### Technical Details
- Mega menu data will be a static constant in `MegaMenu.tsx` matching the exact hierarchy provided. On desktop, hovering a top-level item shows a positioned panel with 2-4 columns of subcategories. On mobile, categories are collapsible accordions.
- Logo will be imported as an ES module from `src/assets/` for proper bundling.
- Vendor dashboard will use shadcn `Tabs` component for the tabbed layout.
- Category seeding migration will insert ~100+ rows with proper parent_id references using CTEs.

