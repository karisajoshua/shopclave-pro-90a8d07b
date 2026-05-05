# Auto-rank vendor stores on Google + shareable QR codes

Two parts: (1) make every vendor store discoverable & indexable by Google automatically, (2) give every store a shareable QR code placed strategically on the store page.

---

## Part 1 — Auto Google ranking for every vendor store

"Auto-ranked" in practice means: every approved store must be **crawlable, indexable, and listed in our sitemap with rich metadata** so Google discovers and ranks it without manual work. Ranking position itself is decided by Google, but we control everything that lets it happen.

### 1a. Dynamic sitemap (edge function)

Today `public/sitemap.xml` is static and doesn't list vendors or products. Replace it with a live one.

- Create edge function `generate-sitemap` (public, no JWT) that queries:
  - all `vendors` where `status = 'approved'` → URL `/store/{slug}`, lastmod = `updated_at`
  - all `products` where `status = 'active'` → URL `/product/{slug}`, lastmod = `updated_at`
  - plus the existing static routes already in `public/sitemap.xml`
- Returns `Content-Type: application/xml` with proper `<urlset>` + `<lastmod>`, `<changefreq>`, `<priority>`.
- Update `public/robots.txt` `Sitemap:` line to point to the function URL (works for both `barakaz.com` and the lovable.app preview via the project's Supabase URL).
- Optionally add a `vercel`-style `_redirects` / lightweight `index.html` rewrite is not needed — Google reads whatever URL `robots.txt` advertises.

### 1b. Per-store SEO meta tags

Vendor store pages currently render without a per-page `<title>` / description, so Google sees the generic homepage title.

- Add `react-helmet-async` (already a tiny lib) and wrap the app in `<HelmetProvider>` in `src/main.tsx`.
- In `VendorStorePage.tsx`, render a `<Helmet>` block with:
  - `<title>{store_name} — Shop on Barakaz</title>`
  - `<meta name="description">` from `store_description` (truncated to ~155 chars, fallback generated)
  - Canonical URL `https://barakaz.com/store/{slug}`
  - Open Graph + Twitter card tags using `logo_url` / `banner_url`
  - JSON-LD `Store` structured data (name, image, url, address if available, aggregateRating from existing review data) — this is what makes Google show rich results.
- Do the same minimal `<Helmet>` on `ProductDetailPage.tsx` (Product schema) so product URLs in the sitemap also rank — this directly funnels traffic to the stores.

### 1c. Indexability hygiene

- Confirm `robots.txt` already allows everything (it does).
- Add `<link rel="canonical">` per page (above) to prevent duplicate-content penalties from query params.
- No "noindex" on vendor pages (verified none today).

---

## Part 2 — Shareable QR code per store

### 2a. Generation

- Add `qrcode.react` (lightweight, renders as SVG, no canvas).
- The QR encodes the public store URL: `https://barakaz.com/store/{slug}` (uses canonical domain, not the preview).

### 2b. Strategic placement on `VendorStorePage.tsx`

Place it in **two** spots so it's useful both on desktop and mobile without crowding the layout:

1. **Header card, right column** (next to Follow / WhatsApp / Phone buttons): a small "Share store" button with a QR icon. Clicking opens a dialog showing:
   - The QR code (240×240 SVG with the store logo centered)
   - The store URL with a "Copy link" button
   - "Download QR" button (exports the SVG as PNG, filename `barakaz-{slug}-qr.png`)
   - "Share" button using the Web Share API where available (mobile)
2. **Inside the dialog only** — keep the page itself uncluttered. This is the "strategic" choice: visible affordance in the header, full QR experience in the modal. Vendors can screenshot/print it for packaging, business cards, shop windows, etc.

Also expose the same QR in the **vendor dashboard** (`VendorDashboard.tsx`) as a small "Your store QR" card so vendors can grab it without visiting their public page.

---

## Technical details

**New files**
- `supabase/functions/generate-sitemap/index.ts` — public edge function returning XML.
- `src/components/vendor/StoreQRDialog.tsx` — reusable QR dialog (props: `storeUrl`, `storeName`, `logoUrl`).
- `src/components/seo/SEO.tsx` — small helper wrapping `<Helmet>` for title/description/canonical/OG/JSON-LD.

**Edited files**
- `public/robots.txt` — point `Sitemap:` to the edge function URL.
- `public/sitemap.xml` — keep as fallback (or delete; robots.txt is the source of truth).
- `src/main.tsx` — wrap app in `HelmetProvider`.
- `src/pages/VendorStorePage.tsx` — add `<SEO>` block, JSON-LD `Store` schema, and the "Share store" button + QR dialog in the header actions column.
- `src/pages/ProductDetailPage.tsx` — add `<SEO>` block + JSON-LD `Product` schema (boosts product URLs in sitemap).
- `src/pages/vendor/VendorDashboard.tsx` — add a small "Your store QR" card.

**Dependencies**
- `react-helmet-async`
- `qrcode.react`

**No DB migration needed** — uses existing `vendors`/`products` columns.

**Manual step the user should do once after deploy** (I'll mention it in the implementation message, not block on it):
- In Google Search Console, submit `https://barakaz.com/sitemap.xml` (which now serves dynamic content via the edge function) — this triggers Google to start crawling all vendor stores.

---

Approve and I'll implement.