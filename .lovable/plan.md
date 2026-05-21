## Plan: Orange theme + visibility fixes + commission engine

### 1. Theme: orange primary, yellow as minimal accent
Currently `--primary`, `--accent`, `--marketplace-orange`, `--ring`, `--sidebar-*` all point to yellow (`48 97% 51%`), so every brand surface (top nav bar, sub-nav, footer "Back to top", newsletter strip, "Become a seller" CTA, mega-menu header) renders yellow text on near-black with poor contrast — and several sections (sub-nav, back-to-top, footer columns) look "fully black" because their text uses `text-primary-foreground` which is also near-black.

**Update `src/index.css`:**
- `--primary`, `--accent`, `--ring`, `--marketplace-orange`, `--sidebar-primary`, `--sidebar-ring`, `--vendor-sidebar-active-bg`, `--admin-accent-vendors` → orange `20 95% 53%` (#ff420e family, matches prior brand)
- `--marketplace-orange-hover` → `20 95% 46%`
- `--marketplace-orange-light` / `--sidebar-accent` → `20 95% 94%`
- `--primary-foreground`, `--sidebar-primary-foreground`, `--accent-foreground`, `--vendor-sidebar-active-fg` → `0 0% 100%` (white — fixes the invisible text on dark nav/footer)
- Introduce a new accent token `--brand-yellow: 48 97% 51%` reserved for sparing highlights (price tags, "New", logo-adjacent flourishes). Not bound to `--primary`.
- Dark nav stays black (`--nav-dark 0 0% 7%`, `--nav-secondary 0 0% 13%`) — but text on them now reads correctly because `text-primary-foreground` becomes white.

**Component touch-ups (only where black-on-black persists):**
- `Footer.tsx` "Back to top" button: use `text-white` semantics via `text-primary-foreground` (now white, automatic fix).
- `Navbar.tsx` sub-nav and mega-menu header: same automatic fix.
- "Become a seller" CTA section: audit the page/section and ensure it uses `bg-[hsl(var(--marketplace-orange))] text-primary-foreground` (white on orange) rather than the previous yellow-on-black combo.

### 2. Visibility audit pass
Quick grep for `text-[hsl(var(--marketplace-orange` and `bg-[hsl(var(--nav-dark` combos and verify every one has readable foreground after the token swap. Files in scope: `Navbar.tsx`, `MegaMenu.tsx`, `Footer.tsx`, `HeroBanner.tsx`, `PromoStrip.tsx`, `VendorRegisterPage.tsx` ("Become a seller").

### 3. Commission + payment-processing fee engine

**Researched rates (industry-standard top-level category commissions, Amazon/Jumia/Etsy benchmarks):**

| Top-level category | Commission |
|---|---|
| Electronics | 8% |
| Phones & Tablets | 8% |
| Fashion | 15% |
| Health & Beauty | 12% |
| Home & Garden | 12% |
| Sports & Fitness | 12% |
| Automotive | 10% |
| Books | 15% |
| (Default / uncategorised) | 12% |

**Payment processing fee:** flat `2.9% + $0.30` per transaction (Stripe standard). Configurable.

**DB migration (new tables):**

```sql
create table public.category_commission_rates (
  category_id uuid primary key references public.categories(id) on delete cascade,
  commission_pct numeric(5,2) not null check (commission_pct between 0 and 50),
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table public.platform_fee_settings (
  id smallint primary key default 1 check (id = 1),
  default_commission_pct numeric(5,2) not null default 12.00,
  payment_processing_pct numeric(5,2) not null default 2.90,
  payment_processing_flat numeric(8,2) not null default 0.30,
  updated_at timestamptz not null default now()
);

-- Seed rates for the 8 top-level categories listed above
insert into public.platform_fee_settings (id) values (1) on conflict do nothing;
```

RLS: select for everyone (rates are not sensitive); insert/update for admins via `has_role(auth.uid(),'admin')`.

**Per-order fee snapshot** — add columns to `order_items` (already stores `vendor_id`, `price`, `quantity`):
- `commission_pct numeric(5,2)`
- `commission_amount numeric(12,2)`
- `payment_fee_amount numeric(12,2)`
- `vendor_payout numeric(12,2)` (= line_total − commission − payment_fee share)

A trigger on `order_items` insert resolves the product's top-level category, looks up the rate (falls back to `default_commission_pct`), computes commission, applies payment-fee share proportional to line total, and writes the snapshot. Existing `vendor_ledger` flow continues but now credits `vendor_payout` instead of gross.

**Admin UI** — new page `src/pages/admin/AdminCommissions.tsx`:
- Table of top-level categories with editable `commission_pct`.
- Inputs for `default_commission_pct`, `payment_processing_pct`, `payment_processing_flat`.
- Save button calls Supabase upsert.
- Linked from `AdminSidebar.tsx` under "Settings".

**Vendor & checkout transparency** (display only, no business-logic changes elsewhere):
- `ProductDetailPage.tsx` (vendor view) and `VendorEarnings.tsx`: show "You earn: $X after Y% commission + processing fee".
- `CheckoutPage.tsx`: unchanged for buyer (they pay the full price).
- `AdminOrders.tsx`: show commission + processing fee + vendor payout per line.

### 4. Out of scope
- No Stripe Connect onboarding yet (still queued for secrets phase). Fees are computed and stored; actual transfer to vendor remains manual until Connect is wired.

### Files changed (estimate)
- `src/index.css` (token swap, new `--brand-yellow`)
- `src/components/layout/{Navbar,Footer,MegaMenu}.tsx` (verify foregrounds)
- `src/pages/VendorRegisterPage.tsx` (Become-a-seller CTA contrast)
- New migration: commission tables, RLS, order_items columns, trigger
- New `src/pages/admin/AdminCommissions.tsx` + route + sidebar link
- `src/pages/admin/AdminOrders.tsx`, `src/pages/vendor/VendorEarnings.tsx`, `src/pages/ProductDetailPage.tsx` (display fee breakdown)
- Memory updates: `mem://style/visual-identity` (orange primary, yellow minimal accent), new `mem://features/commissions`
