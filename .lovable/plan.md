## Plan

### 1. Rebrand to global / Canada-HQ (copy only)

**Tagline (used everywhere):**
- Page title: `Barakaz | Shop Beyond Borders with Barakaz`
- Hero/meta description subtitle: `Global Fashion & Lifestyle Marketplace`

**Files updated (user-facing copy only — no functional code, M-Pesa option, locale fallback, or shipping logic touched):**

- `index.html` — title, description, keywords, og/twitter title+description, JSON-LD WebSite/Organization description. Strip "Kenya", "M-Pesa", `+254` from copy; set Organization description to global.
- `src/pages/Index.tsx` — SEO title to new tagline; description to "Global fashion & lifestyle marketplace…"
- `src/pages/AboutPage.tsx` — Rewrite intro: *"Barakaz is a global multi-vendor marketplace headquartered in Canada, connecting buyers and sellers worldwide."* Replace "Africa" / "Kenya and beyond" phrasing throughout.
- `src/pages/ContactPage.tsx` — Address block → `Barakaz Marketplace, Canada`; JSON-LD `streetAddress`/`addressLocality` → `Canada` / remove city; keep phone/email fields as-is.
- `src/pages/DeliveryPage.tsx` — "across Kenya" → "worldwide"; remove "East Africa expansion" line.
- `src/pages/FAQPage.tsx` — Delivery answer → vendors ship locally and internationally; drop "across Kenya".
- `src/pages/TermsPage.tsx` — Governing law → "laws of Canada".
- `src/pages/SearchPage.tsx` — Meta description strings → "worldwide" instead of "across Kenya".
- `src/pages/VendorStorePage.tsx` — Vendor SEO description → drop "across Kenya".
- `public/llms.txt` — Rewrite as global Canada-HQ marketplace; remove Nairobi/Kenya/M-Pesa lines; keep page list.
- `public/.well-known/ai-plugin.json` — Update both descriptions to global Canada-HQ wording.
- `public/docs/Barakaz-Admin-Manual.md` — Replace Kenya/Nairobi mentions in narrative text.
- `supabase/functions/_shared/transactional-email-templates/order-confirmation.tsx` + `vendor-new-order.tsx` — Only the `previewData` sample address (`city: 'Nairobi', country: 'Kenya'`) → generic Canadian sample (e.g. `Toronto` / `Canada`). No template logic changes.

**Intentionally NOT changed (per "user-facing copy only"):**
- `src/hooks/useLocale.ts` (KE fallback + cache key)
- `src/pages/CheckoutPage.tsx` default country, Nairobi origin label
- `src/pages/vendor/VendorEarnings.tsx`, `VendorSettings.tsx` placeholder text
- `supabase/functions/get-shipping-rates/index.ts` (Kenya city list / KE code)
- `src/pages/admin/*`, `src/pages/vendor/*` payment-related Kenya/M-Pesa mentions tied to functional payment logic
- M-Pesa as a payment label anywhere it represents a real payment method

### 2. Wishlist feature

**Database migration (`public.wishlists`):**
```
id uuid pk, user_id uuid → auth.users, product_id uuid → products, created_at
unique (user_id, product_id)
GRANT SELECT/INSERT/DELETE to authenticated; GRANT ALL to service_role
RLS: users manage only their own rows (auth.uid() = user_id)
```

**Frontend:**
- `src/hooks/useWishlist.ts` — React Query hooks: `useWishlist()` (ids set), `useToggleWishlist()` (insert/delete + invalidate), `useWishlistProducts()` (joined products for the wishlist page). Guests → redirect to `/auth` on toggle.
- `src/components/marketplace/ProductCard.tsx` — Add small heart button overlay (top-right of image). Filled when in wishlist, outline otherwise. Stops click propagation.
- `src/pages/ProductDetailPage.tsx` — "Add to wishlist" button next to Add to Cart.
- `src/pages/WishlistPage.tsx` — New page: grid of saved products, remove button per item, empty state, auth-gated.
- `src/App.tsx` — Route `/wishlist` (and `/account/wishlist`).
- `src/pages/AccountPage.tsx` — Add "My Wishlist" entry in the account menu.
- `src/components/layout/Navbar.tsx` — Heart icon next to cart (desktop) linking to `/wishlist`.
- `src/components/layout/MobileBottomNav.tsx` — Add Wishlist tab if there's room; otherwise keep within Account.

### 3. Out of scope this pass

- Saved Addresses and Return Requests (deferred per your selection).
- Order History and Product Reviews already exist — no changes.

### 4. Memory update

Update `mem://project/identity` to: global multi-vendor marketplace HQ Canada, tagline "Shop Beyond Borders with Barakaz / Global Fashion & Lifestyle Marketplace". Note that locale/shipping/payment functional code still references Kenya/M-Pesa intentionally.
