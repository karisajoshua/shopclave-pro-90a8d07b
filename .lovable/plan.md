
# Update subscription plans: competitive pricing + feature lists

## Goals
1. Make the 4 paid plans more competitive for the Kenyan classifieds/marketplace market.
2. Show vendors exactly what they get in each plan (a benefits checklist) on the upgrade cards.

## Proposed new pricing (KSh / month)

Current pricing is too steep at the top end (Premium KSh 5,000, Enterprise KSh 15,000) for a Kenyan vendor classifieds market and the gaps between tiers are uneven. New pricing:

| Plan | Old price | New price | Listings | Duration |
|------|-----------|-----------|----------|----------|
| Free | 0 | 0 | 5 | 365 days |
| Basic | 500 | **299** | 15 | 30 days |
| Standard | 1,500 | **799** | 60 | 30 days |
| Premium | 5,000 | **1,999** | 250 | 30 days |
| Enterprise | 15,000 | **4,999** | Unlimited (9,999) | 30 days |

Rationale: pricing now starts low to convert Free users, scales ~2.5–3x between tiers, and the top tier is positioned as a "go big" option rather than premium-priced. Listing caps also increase to make each tier feel meaningfully better.

## Feature lists per plan

Each plan card on the vendor dashboard will display a bullet list of benefits using check icons.

- **Free** — 5 active listings · Basic store page · Standard support
- **Basic** — 15 active listings · Store page with logo & banner · WhatsApp/Call buttons · Email support
- **Standard** — 60 active listings · Everything in Basic · Featured in category pages · Vendor analytics dashboard · Priority email support
- **Premium** — 250 active listings · Everything in Standard · Homepage feature rotation · Promoted in search results · Bulk product import · Priority chat support
- **Enterprise** — Unlimited listings · Everything in Premium · Top placement across the site · Dedicated account manager · Custom store branding · 24/7 priority support

## Technical changes

### `src/lib/subscriptionPlans.ts`
- Update `PLANS` array with new prices and listing caps above.
- Extend the `Plan` interface with a `features: string[]` field and populate it for each plan.
- Keep `getPlanLimit` and `isAdminUnlimited` unchanged.

### `src/pages/vendor/VendorDashboard.tsx`
- In the "Upgrade Your Plan" grid (currently filtering out `free`), redesign each plan card so it stretches to fit the feature list:
  - Plan name + price (unchanged)
  - Listing count line (unchanged)
  - New `<ul>` rendering `plan.features` with a small `Check` icon (lucide) and muted text
  - "Current" badge or "Upgrade" button at the bottom (unchanged behaviour)
- Switch the grid to `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` so feature lists stay readable on mobile.
- Make cards `flex flex-col` with the action button pushed to the bottom (`mt-auto`) so cards align even when feature lists differ in length.

## Out of scope
- No DB schema changes. Existing `vendor_subscriptions.price` / `max_listings` rows stay as-is; new payments will use the new pricing.
- No changes to `AdminSubscriptions.tsx` (admins can still manually override price/listings when creating a subscription).
- No marketing copy or pricing page outside the vendor dashboard.
- Features shown are descriptive of what already exists in the platform — no new gating or enforcement of per-plan features in this change.
