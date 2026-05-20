
## Goal

Move Barakaz from a classifieds model (buyers contact vendors directly, pay them outside the platform) to a full transactional marketplace where:
- Customers pay online (Stripe, multi-currency: USD / GBP / CAD).
- Vendors get paid automatically via Stripe Connect when they request a withdrawal.
- Shipping costs are quoted live via Shippo at checkout.
- All vendor phone / WhatsApp contact options are removed from product pages.

Initial markets: US, UK, Canada.

---

## 1. Remove direct vendor contact (UI cleanup)

- Product detail page (`ProductDetailPage.tsx`): remove the "Call vendor" phone reveal and the "Chat on WhatsApp" button. Keep in-app chat with vendor (for pre-sale questions only).
- Vendor store page (`VendorStorePage.tsx`): remove visible phone/WhatsApp; keep store name, rating, follow.
- Vendor settings: hide M-Pesa / direct-bank-payout fields (replaced by Stripe Connect onboarding).
- Remove "Pay Vendor Directly" option from checkout payment methods.
- Update `marketplace-logic` and `communication` memory files to reflect the new model.

## 2. Multi-currency online checkout (Stripe)

- Enable Lovable's built-in Stripe payments (`enable_stripe_payments`). Pre-check: confirm the project is on Pro plan and Lovable Cloud is enabled.
- Tax handling: recommend **option 2 — automatic tax calculation only** (Stripe Tax) since vendors will be the merchants of record via Connect; this avoids managed-payments restrictions and works for physical goods.
- Store product prices in **USD** as the base; convert display prices to GBP/CAD using the existing `fx.ts` helper (extend cache list).
- Add a currency selector in the navbar; persist to localStorage.
- At Stripe checkout session creation, pass the buyer's chosen currency and let Stripe handle the charge in that currency.
- Replace the "KSh" rendering across product cards, cart, checkout, order confirmation, vendor earnings with a `<Money>` component that formats per active currency.

## 3. Stripe Connect for vendor payouts

- Add a "Payouts" section in Vendor Settings with a "Connect bank account" button → creates a Stripe Connect **Express** account, returns onboarding link, redirects vendor through Stripe-hosted KYC.
- New table `vendor_stripe_accounts` (vendor_id, stripe_account_id, charges_enabled, payouts_enabled, country, default_currency, requirements_due, updated_at) with RLS: vendor reads own, admins read all.
- Edge function `stripe-connect-onboard` — creates account + onboarding link.
- Edge function `stripe-connect-refresh` — refreshes account status (called on return from Stripe).
- Edge function `stripe-webhook` — listens for `account.updated`, `payout.paid`, `payout.failed`, `charge.succeeded`, `charge.refunded`, `transfer.created` and updates our DB.

## 4. Vendor earnings & withdrawal flow

- New table `vendor_balances` (vendor_id PK, available_amount, pending_amount, currency, updated_at).
- New table `vendor_ledger` (vendor_id, order_item_id, type ∈ {sale, commission, refund, withdrawal, adjustment}, amount, currency, status, stripe_reference, created_at). Source of truth for balance.
- On `charge.succeeded` webhook: insert `sale` (gross) and `commission` (negative platform cut) rows for each order item belonging to that order; recompute available/pending.
- New table `withdrawals` (vendor_id, amount, currency, status, stripe_payout_id, requested_at, completed_at, failure_reason).
- Edge function `request-withdrawal`:
  1. Validates vendor's Stripe Connect account is `payouts_enabled`.
  2. Checks `vendor_balances.available_amount >= requested amount`.
  3. Creates Stripe Transfer to connected account + Payout, inserts `withdrawal` row, deducts from balance.
  4. Returns success/failure.
- Vendor dashboard updates:
  - `VendorEarnings.tsx`: show available balance, pending balance, lifetime sales, ledger table, "Request withdrawal" CTA.
  - `VendorDashboard.tsx`: KPI tiles (sales count, revenue, pending payout, completed payouts).
- Admin: `AdminWithdrawals.tsx` becomes a monitoring view (read-only) since payouts are now automated.

## 5. Shippo shipping rates

- Add `SHIPPO_API_KEY` as a runtime secret.
- New edge function `get-shipping-rates`:
  - Input: cart items (with vendor_id, weight, dimensions), buyer address.
  - Groups items by vendor (each vendor ships separately).
  - For each vendor: builds a Shippo Shipment (from vendor's warehouse address → buyer address) and returns the cheapest rate per carrier.
  - Output: per-vendor shipping options + total.
- Vendor product form: add weight (g) + dimensions (cm) + ships-from country fields to `products` table.
- Vendor settings: add warehouse address (used as Shippo "from" address).
- Checkout step 2: after buyer enters address, call `get-shipping-rates`, let buyer pick a rate per vendor, sum into order total.
- Order: persist chosen `shipping_rate_id` and Shippo `tracking_number` once label is purchased.
- Vendor orders page: "Buy label" button → edge function `buy-shipping-label` calls Shippo, attaches tracking to order item, charges shipping back against vendor balance.

## 6. Database migrations needed

- `vendor_stripe_accounts` (new)
- `vendor_balances` (new)
- `vendor_ledger` (new)
- `withdrawals` (new)
- `products`: add `weight_g`, `length_cm`, `width_cm`, `height_cm`, `ships_from_country`
- `vendors`: add `warehouse_address` JSONB, `default_currency`
- `orders`: add `currency`, `shipping_total`, `tax_total`, `stripe_payment_intent_id`
- `order_items`: add `shipping_rate_id`, `tracking_number`, `carrier`, `label_url`, `shipping_amount`
- RLS on all new tables (vendor reads own, admins read all, service role writes via webhooks).

## 7. Edge functions to add

- `stripe-connect-onboard`
- `stripe-connect-refresh`
- `stripe-webhook` (extends existing payment webhook patterns)
- `request-withdrawal`
- `get-shipping-rates`
- `buy-shipping-label`

## 8. Secrets

- `SHIPPO_API_KEY` (request via add_secret after plan approval).
- Stripe keys are managed automatically by Lovable's built-in Stripe.

## 9. Out of scope (this iteration)

- KES / M-Pesa support removal of UI references only; full delocalization to follow once US/UK/CA traffic stabilises.
- Returns/refund self-service UI (admin-handled for now via Stripe dashboard refund + ledger `refund` entry).
- Multi-warehouse per vendor.
- Customs/duties calculation beyond what Shippo includes.

---

## Approvals needed before I start building

1. Confirm Pro plan + Lovable Cloud are enabled (required for Stripe Connect).
2. You'll need to create a Shippo account and have an API key ready (free tier works for rate quotes).
3. Vendors will each need to complete Stripe Connect KYC before they can receive payouts — existing vendors will see a banner prompting them.

Once approved I'll execute in this order: DB migrations → Stripe Connect onboarding → checkout (Stripe + currency) → Shippo rates → earnings/withdrawal → UI cleanup of phone/WhatsApp.
