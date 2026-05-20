
## Continuation plan (secrets deferred)

The schema is already migrated. I'll build everything else now. Edge functions that need `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, or `SHIPPO_API_KEY` will read them at runtime and return a clean `503 "Integration not configured"` until you add them. The rest of the app (UI, balances UI, vendor onboarding banner) works without the secrets.

### Execution order

**Phase A — UI cleanup (no secrets needed)**
1. `ProductDetailPage.tsx`: remove "Call vendor" phone reveal + WhatsApp button. Keep in-app chat.
2. `VendorStorePage.tsx`: remove phone/WhatsApp surfaces.
3. `CheckoutPage.tsx`: drop `vendor_payment` (Pay Vendor Directly) and `mpesa` options; keep `card` only.
4. `VendorSettings`: hide M-Pesa/bank-detail fields behind a deprecated note; add a "Payouts" tab placeholder that wires into Stripe Connect onboarding (Phase C).
5. Add a global `<Money>` component and `CurrencyContext` (USD/GBP/CAD), with selector in `Navbar`. Replace all `KSh {n.toLocaleString()}` usages in product cards, cart, checkout, order pages.

**Phase B — Shippo shipping rates**
6. Add weight / dimensions / ships-from fields to the Add/Edit Product wizard (step "Shipping").
7. Add warehouse address fields to Vendor Settings.
8. Edge function `get-shipping-rates` — groups cart by vendor, calls Shippo per vendor, returns cheapest rates. Graceful 503 if no key.
9. Checkout step 2: after address entry, fetch rates, let buyer pick per vendor, add to total.

**Phase C — Stripe Connect onboarding**
10. Edge function `stripe-connect-onboard` — creates Express account + onboarding link.
11. Edge function `stripe-connect-refresh` — refreshes account status from Stripe.
12. Vendor Settings → Payouts tab: "Connect bank account" CTA, status pills (charges enabled / payouts enabled / requirements due), refresh button.
13. Vendor dashboard banner urging incomplete vendors to finish KYC.

**Phase D — Checkout (Stripe Payment Intent w/ destination charges)**
14. Edge function `create-stripe-checkout` — builds a Stripe Checkout Session with `payment_intent_data.transfer_group` per order (Connect destination charges not used directly because we have multi-vendor carts; instead capture funds to platform, then push to vendors via Transfers on payout request).
15. Edge function `stripe-webhook` — handles `checkout.session.completed`, `payment_intent.succeeded`, `charge.refunded`, `account.updated`, `payout.paid`, `payout.failed`, `transfer.created`. Writes ledger entries and updates balances.
16. Rewrite `create-order` → `create-order` returns the existing order + a Stripe Checkout URL; cart redirects to Stripe; on return, `OrderConfirmationPage` polls order status.

**Phase E — Vendor earnings & withdrawals**
17. `VendorEarnings.tsx`: show available / pending / lifetime, recent ledger, "Request withdrawal" CTA.
18. Edge function `request-withdrawal` — validates Connect payouts enabled + sufficient balance, creates Stripe Transfer + Payout, inserts `withdrawal` row, inserts `withdrawal` ledger entry (negative).
19. `AdminWithdrawals.tsx`: read-only monitoring of automatic payouts; manual override action when a payout fails.

**Phase F — Memory + cleanup**
20. Update `mem://features/marketplace-logic`, `mem://integrations/communication`, `mem://ui/checkout-experience`, and Core index to reflect the new transactional model.
21. Remove `natively-geolocation` references from checkout (no longer used for delivery quotes; Shippo handles).

### What I will NOT touch this round
- KES/Swahili copy elsewhere in the site (will mark for a follow-up i18n pass).
- Returns/refund self-service UI — admins handle via Stripe dashboard + manual ledger entry.
- Real label-purchase flow (`buy-shipping-label`) — stubbed; vendor copies tracking number manually for v1.

### Risks / open items
- Stripe Connect requires the platform's own Stripe account with Connect enabled in the dashboard (BYOK). The seamless Lovable-managed Stripe payments does not expose Connect APIs, so you'll need to provide `STRIPE_SECRET_KEY` from a Stripe account where you've enabled Connect → Express accounts.
- Multi-vendor cart payouts use the "Separate charges & transfers" pattern (platform receives funds, transfers per vendor on payout). This means the platform briefly holds funds — review your jurisdiction's money-transmitter rules.
- Existing in-flight orders in the `orders` table default to `currency='usd'`; verify no legacy KES orders break.

Ready to execute Phase A → F end-to-end without waiting for the secrets.
