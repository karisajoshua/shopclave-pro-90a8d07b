

## Plan: Amazon-Style Redesign for Barakaz

### Overview
Transform the Barakaz marketplace to match Amazon's layout and UX patterns: dark navbar with hamburger sidebar menu, Amazon-style hero with category cards containing 4 clickable subcategory images each, language selector, auto-currency detection, updated logo sizing, and Jumia-style footer with Barakaz brand colors.

### Changes

#### 1. Update Logo
- Copy `user-uploads://barakaz_logo.png` to `src/assets/barakaz-logo.png` (replacing existing) -- this is the wider text+icon version
- Increase logo height in Navbar (~40px) and Footer (~32px)

#### 2. Amazon-Style Navbar
- **Dark background** (like Amazon's `#131921`) instead of white card
- **Left hamburger menu** button with "All" text (like Amazon's "All" menu)
- Clicking hamburger opens a **slide-out sidebar drawer** (Sheet component) with the full category mega menu (accordion style)
- **Search bar** centered, prominent, with category dropdown prefix
- **Right side**: "Deliver to [Country]" with auto-detected location, Language selector dropdown, Account/Sign In, Cart
- **Secondary nav bar** below with quick links (Today's Deals, Sell on Barakaz, etc.)
- Remove the current horizontal mega menu bar

#### 3. Language & Currency
- Create a `useLocale` hook that auto-detects user's country via browser `navigator.language` and free IP geolocation API
- Currency map: KE→KSh, US→$, GB→£, NG→₦, etc.
- Language selector in navbar (EN, SW for Swahili, FR) -- UI only for now, stores preference in localStorage
- Format prices using `Intl.NumberFormat` with detected currency

#### 4. Amazon-Style Homepage Hero
- Replace current gradient hero banner with a **carousel/slider** of promotional banners (auto-rotating)
- Below the hero: **Grid of category cards** (2x4 on desktop, 2x2 on mobile) -- each card has:
  - A title (e.g. "Top categories in Electronics")
  - 4 subcategory items in a 2x2 grid, each with an image and label
  - A "See all" link at the bottom
  - All items are clickable Links to `/category/[slug]`
- Use placeholder images from Unsplash for subcategories

#### 5. Amazon-Style Footer
- Match the Jumia footer screenshot structure with Barakaz brand colors:
  - **"Back to top" button** at the very top
  - **Newsletter section** with email input (deep orange background)
  - **4-column link grid** on dark background: "Need Help?", "About Barakaz", "Make Money with Barakaz", "Barakaz Services"
  - **Bottom bar** with logo + copyright
  - All using the deep orange (`--marketplace-dark` adjusted to match brand)

#### 6. Mobile Responsiveness
- Hamburger sidebar works on all screen sizes
- Category cards stack 1-2 columns on mobile
- Footer columns stack on mobile
- Search bar full width on mobile

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/assets/barakaz-logo.png` | Replace with new wider logo |
| `src/components/layout/Navbar.tsx` | Major rewrite -- Amazon dark style, hamburger, language/currency |
| `src/components/layout/MegaMenu.tsx` | Refactor into sidebar drawer menu |
| `src/components/layout/Footer.tsx` | Rewrite -- Jumia-style with brand colors |
| `src/components/marketplace/HeroBanner.tsx` | Rewrite -- carousel + category cards grid |
| `src/hooks/useLocale.ts` | Create -- auto-detect country, currency, language |
| `src/pages/Index.tsx` | Update to use new hero + category cards layout |
| `src/index.css` | Add Amazon-dark nav color tokens |

### Technical Details
- Hamburger sidebar uses shadcn `Sheet` component (side="left")
- Currency detection: use `Intl.DateTimeFormat().resolvedOptions().timeZone` to infer country, with a timezone-to-currency mapping. No external API needed.
- Category cards data is a static array with Unsplash placeholder images, linking to `/category/[slug]`
- Hero carousel uses CSS-only auto-rotation or a simple `setInterval` state toggle

