

# Featured products filter, richer Admin Dashboard, and a high-end admin UI refresh

## 1. Homepage — Featured Products only

**File:** `src/pages/Index.tsx`

Change the `featured-products` query to filter by `featured = true`:

```ts
.eq("status", "active")
.eq("featured", true)
.order("created_at", { ascending: false })
.limit(8)
```

**Empty state behavior:** if no admin-featured products exist, hide the section entirely (don't fall back to demo products in production data) — show demo products only when both real & featured lists are empty AND there are zero active products at all (true "first-run demo" scenario).

**Admin side already works** (verified `AdminProducts.tsx` line 178–181: star button toggles `featured`). I'll add:
- A "Featured" filter chip at the top of `/admin/products` so admins can quickly see which products are currently featured on the homepage.
- A small "Shown on homepage" badge next to featured products in the table.

## 2. Admin Dashboard — fuller picture

The current `/admin` page shows site analytics + 6 stat tiles + revenue chart + top vendors/products/orders. It's missing the "what needs my attention NOW" layer that admins actually open the dashboard for.

**Add to `AdminDashboard.tsx`:**

**A. "Action Required" panel (top of dashboard, above analytics)** — live counts with click-through:
- Pending vendor approvals (vendors where `status = 'pending'`) → `/admin/vendors`
- Pending withdrawal requests → `/admin/withdrawals`
- Pending subscription payments to verify → `/admin/subscriptions`
- Open disputes → `/admin/evidence`
- Orders awaiting action (status = 'pending' > 24h) → `/admin/orders`
- Low-stock products (stock < 5, status active) → `/admin/products`

Each is a clickable card with count + icon + colored severity (red if >0 disputes, amber for pending items).

**B. Quick navigation grid** — 8 large icon tiles for the most-used sections (Vendors, Products, Orders, Withdrawals, Evidence, Categories, Users, Settings). Mobile-friendly entry point that doesn't require opening the sidebar.

**C. Recent activity feed** — last 15 entries from `audit_logs` (order status changes, disputes, message events), with timestamp and user. Gives admins a live operational pulse.

**D. Risk alerts strip** — count of users with active `user_risk_flags` (e.g. delete_abuse), one-click to a filtered view.

**E. Today vs Yesterday delta chips** on the existing stat cards (e.g. "Revenue: KSh 12,400 ▲ 18% vs yesterday").

## 3. Admin UI refresh — modern, high-end look

**Honest senior-engineer take:** the current admin panel is **functional but generic** — flat cards, basic tables, no visual hierarchy, no depth, no brand presence beyond the watermark. It looks like a Tailwind starter. For a marketplace handling money, disputes, and evidence, it should feel like a professional ops cockpit (think Stripe Dashboard, Linear, Shopify Admin). Worth refreshing.

**Changes I'll make (design-token level, no full rewrite):**

**Visual system**
- Switch admin shell to a **dual-tone surface system**: deep slate sidebar (`hsl(220 25% 10%)` dark), off-white app surface, white elevated cards with soft shadow + 1px border. Adds depth without being noisy.
- Remove the giant centered watermark icon in the main area — it competes with content. Replace with a subtle top-right brand mark in the header.
- Tighten typography: page title 22px semibold, section labels 12px uppercase tracked, table headers smaller and muted. Consistent 24px section spacing.

**Components**
- **Stat cards v2**: larger numerals, icon in a tinted square, delta chip below value, subtle gradient accent on the left edge color-coded per metric (revenue=green, orders=blue, etc.). Soft shadow on hover.
- **Tables**: zebra rows, hover highlight, status badges with pill + dot indicator, sticky header on scroll, row click affordance.
- **Sidebar**: dark theme, grouped sections with labels ("Operations", "Catalog", "Finance", "Insights", "System"), active item with left accent bar + bg tint, hover micro-interactions, collapse animation tightened.
- **Header**: add a global search (orders / vendors / products), notifications bell with unread count from `notifications` table, admin avatar dropdown. Replaces the current bare title + back button.
- **Empty states**: each table/list gets a designed empty state (icon + headline + CTA) instead of "No data yet" text.
- **Page transitions**: subtle fade-in on route change.

**Files I'll touch**
- `src/index.css` / `tailwind.config.ts` — add admin-specific tokens (sidebar surface, elevated card shadow, accent gradients).
- `src/components/admin/AdminLayout.tsx` — header redesign (global search, notifications, avatar), remove watermark, switch to dual-tone shell.
- `src/components/admin/AdminSidebar.tsx` — dark theme, grouped sections, active accent bar.
- `src/components/admin/AdminStatCard.tsx` (new) — reusable polished stat card with delta chip.
- `src/components/admin/ActionRequiredPanel.tsx` (new) — live counts with severity colors.
- `src/components/admin/QuickNavGrid.tsx` (new) — 8-tile launcher.
- `src/components/admin/RecentActivityFeed.tsx` (new) — audit-log timeline.
- `src/components/admin/AdminHeader.tsx` (new) — global search + notifications + avatar.
- `src/pages/admin/AdminDashboard.tsx` — wire in the 4 new sections, use new stat cards.
- `src/pages/Index.tsx` — featured filter + empty-state logic.
- `src/pages/admin/AdminProducts.tsx` — "Featured" filter chip + "On homepage" badge.

## Out of scope
- Wholesale redesign of every admin sub-page (Products, Orders, Users tables) — they'll inherit the new tokens/components automatically and look much better, but I won't restructure each page's layout in this round. If you want, a Phase 2 can polish each individual sub-page after you see the new shell.
- Implementing global search results (the input + UI will land; hooking up cross-table search is its own task).
- Dark mode toggle for the customer-facing site.

