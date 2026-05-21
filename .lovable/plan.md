## Plan: Rebrand to Yellow/Black + Location-Based Currency

### 1. Theme rebrand (orange → yellow #fccb04 + black)

Update design tokens only — components already use semantic tokens, so no per-component edits needed.

**`src/index.css`** — replace orange HSL values:
- `--primary` → `48 97% 50%` (yellow #fccb04)
- `--primary-foreground` → `0 0% 7%` (near-black, for contrast on yellow)
- `--marketplace-orange` → yellow
- `--marketplace-orange-hover` → darker yellow `48 97% 44%`
- `--marketplace-orange-light` → `48 97% 92%`
- `--marketplace-dark` / nav background → black `0 0% 7%`
- `--ring`, `--accent` (where they referenced orange) → yellow
- Dark-mode counterparts updated to match

**`tailwind.config.ts`** — no changes needed (tokens are HSL refs).

**Logo / favicon** — leave as-is (already yellow + black).

### 2. Location-based currency display

Right now prices were hard-replaced from `KSh` to `$`. We need real geo-aware formatting.

**Detection** (one-time per session):
- Use the existing `natively-geolocation` edge function (or `navigator.language` + `Intl.Locale` as fallback) to detect country.
- Map country → currency: KE→KES, US→USD, GB→GBP, CA→CAD, EU members→EUR, else USD.

**FX rates**:
- `src/lib/fx.ts` already exists — extend it with a static rate table (USD base) refreshed lazily, OR keep a hardcoded snapshot for now (USD, GBP, CAD, EUR, KES). All product prices in DB are stored in their `vendor.default_currency` (or implicit base). We'll treat the stored numeric `price` as **USD base** for display conversion.

**`CurrencyContext`** (new, lightweight):
- Provides `{ currency, symbol, format(amount) }`.
- On mount: detect country → set currency. Persist override in `localStorage` (`barakaz_currency`).
- Optional manual selector in `Navbar` (USD / GBP / CAD / EUR / KES).

**`<Money amount={n} />` component** (new):
- Wraps `format()`; replaces every hardcoded `${n.toLocaleString()}` and `${n}` in product/cart/checkout UIs.

**Files to update to use `<Money>`**:
- `ProductCard.tsx`, `ProductDetailPage.tsx`, `CartPage.tsx`, `CheckoutPage.tsx`, `SearchPage.tsx`, `VendorStorePage.tsx`, `OrderConfirmationPage.tsx`, `AccountPage.tsx`, `VendorDashboard.tsx`, `VendorOrders.tsx`, `VendorEarnings.tsx`, `AdminOrders.tsx`, `AdminDashboard.tsx`, `AdminWithdrawals.tsx`, `AdminSubscriptions.tsx`.
- Form input labels (e.g. "Price (USD)") show the **vendor's listing currency**, not the buyer's — keep these in vendor's `default_currency`.

### 3. Out of scope (kept as-is)
- Stripe Checkout still charges in the order's stored `currency` field (USD default). Real multi-currency settlement comes with Stripe integration phase.
- No DB schema changes.

### Files changed (estimated)
- `src/index.css` (token swap)
- `src/lib/fx.ts` (rate table + helpers)
- `src/contexts/CurrencyContext.tsx` (new)
- `src/components/Money.tsx` (new)
- `src/components/layout/Navbar.tsx` (currency selector, optional)
- `src/App.tsx` (wrap with `<CurrencyProvider>`)
- ~14 page/component files: swap hardcoded `$` strings for `<Money>`
