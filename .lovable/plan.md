

## Plan: Footer Content Pages, Multi-Language Translation, Placeholder Icon, Dashboard Background, and App Store Badges

### 1. Create Static Content Pages

Create a reusable page component and individual routes for footer links that currently go nowhere:

**New file: `src/pages/StaticPage.tsx`** -- A wrapper component that renders markdown-like content inside MarketplaceLayout.

**New pages (lightweight components using StaticPage):**
- `/privacy-policy` -- Privacy Policy content
- `/cookie-policy` -- Cookie Policy content  
- `/terms` -- Terms & Conditions content
- `/about` -- About Us content
- `/help` -- Help Center content
- `/contact` -- Contact Us content
- `/delivery` -- Delivery Services info
- `/return-policy` -- Return Policy info

**Update `src/App.tsx`** -- Add routes for all new pages.

**Update `src/components/layout/Footer.tsx`** -- Point links to correct routes instead of `/` or `/search`. Add App Store and Google Play badge images above "Powered by Texcortech Systems".

### 2. Full Site Translation (10 Languages)

Build a lightweight i18n system using React Context + a translations dictionary. When a user selects a language, all UI strings across the site change.

**New file: `src/contexts/TranslationContext.tsx`**
- Contains a `translations` object with keys for all major UI strings (navbar, footer, buttons, headings, etc.) in 10 languages
- Languages: English, Kiswahili, Français, Español, العربية, Português, Deutsch, 中文, Soomaali, हिन्दी
- Provides a `t(key)` function and `language`/`setLanguage` via context
- Wraps the app in `App.tsx`

**Update `src/hooks/useLocale.ts`** -- Expand LANGUAGES array to 10 languages.

**Update `src/components/layout/Navbar.tsx`** -- Use `t()` for all static strings (search placeholder, "All", "Today's Deals", "Account & Lists", "Cart", etc.).

**Update `src/components/layout/Footer.tsx`** -- Use `t()` for all footer text.

**Update other key pages** -- Index, SearchPage, CartPage, ProductDetailPage -- use `t()` for headings, buttons, and labels.

### 3. Uploaded Icon as Default Placeholder and Dashboard Background

**Copy uploaded icon** to `src/assets/barakaz-icon.png`.

**Update placeholder references** across components:
- `src/components/marketplace/ProductCard.tsx` -- Use icon as fallback image
- `src/pages/admin/AdminProducts.tsx` -- Use icon for missing product images
- `src/pages/SearchPage.tsx` -- Replace Unsplash placeholder with icon
- `src/pages/ProductDetailPage.tsx` -- Fallback image

**Add as background to dashboard layouts:**
- `src/components/admin/AdminLayout.tsx` -- Add the icon as a low-opacity background image on the main content area (`opacity-5`, centered, `bg-no-repeat bg-center`)
- `src/components/vendor/VendorLayout.tsx` -- Same treatment

### 4. App Store Badges in Footer

**Copy uploaded App Store/Google Play image** to `src/assets/app-store-badges.png`.

**Update `src/components/layout/Footer.tsx`** -- Add the badges image in the bottom bar area, above "Powered by Texcortech Systems". Display as two side-by-side badges linking to `#` (placeholder URLs).

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/assets/barakaz-icon.png` | Copy uploaded icon |
| `src/assets/app-store-badges.png` | Copy uploaded badges |
| `src/contexts/TranslationContext.tsx` | Create -- i18n context with 10 languages |
| `src/pages/StaticPage.tsx` | Create -- reusable static content wrapper |
| `src/pages/PrivacyPolicyPage.tsx` | Create |
| `src/pages/CookiePolicyPage.tsx` | Create |
| `src/pages/TermsPage.tsx` | Create |
| `src/pages/AboutPage.tsx` | Create |
| `src/pages/HelpCenterPage.tsx` | Create |
| `src/pages/ContactPage.tsx` | Create |
| `src/pages/DeliveryPage.tsx` | Create |
| `src/pages/ReturnPolicyPage.tsx` | Create |
| `src/App.tsx` | Add routes for all static pages, wrap with TranslationProvider |
| `src/hooks/useLocale.ts` | Expand to 10 languages |
| `src/components/layout/Footer.tsx` | Fix links, add app badges, use `t()` |
| `src/components/layout/Navbar.tsx` | Use `t()` for all strings |
| `src/components/marketplace/ProductCard.tsx` | Use icon as placeholder |
| `src/pages/SearchPage.tsx` | Use icon as placeholder |
| `src/pages/admin/AdminProducts.tsx` | Use icon as placeholder |
| `src/components/admin/AdminLayout.tsx` | Add background icon with low opacity |
| `src/components/vendor/VendorLayout.tsx` | Add background icon with low opacity |

