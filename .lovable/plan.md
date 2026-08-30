# Switch payment processing from Stripe to Paystack

Replace Stripe end-to-end with Paystack, keeping the exact same checkout flow buyers and vendors already use: buyer picks "Card", an order is created, buyer is redirected to a hosted payment page, a webhook confirms payment, and each vendor's share is settled automatically minus platform commission.

## What you need to do first (guided setup)

1. Create a free account at paystack.com and complete the business profile.
2. In the Paystack dashboard, go to Settings, API Keys & Webhooks.
3. Copy the **Test Secret Key** (`sk_test_...`) and **Test Public Key** (`pk_test_...`).
4. Leave the webhook URL blank for now — I will generate the callback URL during implementation and give it to you to paste in.
5. When I ask, paste the secret key into the secure form. The public key is safe to keep in code.

Nothing goes live until you switch to live keys later.

## Payment flow after the change

```text
Buyer selects Card at checkout
   -> create-order            (unchanged: order + order_items + fees)
   -> paystack-initialize     (new: returns hosted payment URL)
   -> Paystack checkout page  (card, bank, USSD, mobile money, Apple Pay)
   -> redirect back to /order-confirmation/:id
   -> paystack-webhook        (verifies signature, marks order paid,
                               records per-vendor split settlement)
```

## Vendor payouts

Vendors move from Stripe Connect to **Paystack subaccounts with split payments**:

- The vendor "Payments" page becomes a form for bank country, bank, and account number. Paystack resolves and validates the account name before saving.
- A subaccount is created for each vendor; the ID is stored alongside their vendor row.
- At payment time the charge is split by Paystack itself: each vendor's `vendor_payout` share goes to their subaccount, and the platform keeps commission plus processing fee.
- Orders with vendors who have not connected a payout account fall back to platform-collected funds, tracked in the existing vendor ledger and paid through the existing withdrawal request flow.

## Currency

Product prices stay stored in CAD. Paystack does not settle CAD, so at checkout the total is converted to a Paystack-supported currency using the existing FX helper:

- Buyer in Nigeria, Ghana, South Africa, or Kenya -> charged in NGN, GHS, ZAR, or KES.
- Everyone else -> charged in USD.
- The converted amount and its currency are shown on the checkout button before redirect, and stored on the order so confirmation emails and admin views match what was charged.

## Technical details

**Database migration**
- New table `vendor_paystack_accounts` (vendor_id unique, subaccount_code, bank_code, account_number_last4, account_name, currency, percentage_charge, active, timestamps) with GRANTs, RLS: vendor reads/writes own row, admins read all, service_role full.
- `orders`: add `paystack_reference`, `charged_currency`, `charged_amount`.
- `order_items`: add `paystack_split_code` (nullable) for settlement traceability.
- Keep the Stripe columns and `vendor_stripe_accounts` in place but unused, so historical orders stay readable.

**Edge functions**
- `paystack-initialize` (verify_jwt = true): validates the caller owns the order, recomputes the total server-side from `order_items` (never trusts the client), converts CAD to the target currency, builds a `split` payload from each vendor's subaccount and `vendor_payout`, calls `POST /transaction/initialize`, stores the reference, returns `authorization_url`.
- `paystack-webhook` (verify_jwt = false): verifies the `x-paystack-signature` HMAC-SHA512 against `PAYSTACK_SECRET_KEY`, handles `charge.success` (mark order paid + processing, stamp reference), `charge.failed`, and `transfer.*` for payout status. Idempotent on reference.
- `paystack-verify` (verify_jwt = true): called by the confirmation page on return, re-verifies the transaction directly with Paystack so the buyer sees the right state even if the webhook is delayed.
- `paystack-subaccount` (verify_jwt = true): resolves the bank account name via `/bank/resolve`, creates or updates the vendor subaccount, saves the row.
- `paystack-banks` (verify_jwt = true): proxies `/bank?country=` for the dropdown.
- Delete `create-stripe-checkout`, `stripe-webhook`, `stripe-connect-onboard`, `stripe-connect-status` and their `config.toml` entries.

**Frontend**
- `src/pages/CheckoutPage.tsx`: swap the `create-stripe-checkout` invoke for `paystack-initialize`; replace the `vendor_stripe_accounts` readiness query with `vendor_paystack_accounts`; show the converted charge amount on the pay button.
- `src/pages/vendor/VendorPayments.tsx`: rewritten as the Paystack bank-details form with connected/not-connected states and the same payout explainer copy, updated for Paystack's T+1 settlement.
- `src/pages/OrderConfirmationPage.tsx`: call `paystack-verify` with the returned reference instead of reading a Stripe session id.
- Admin order views show the Paystack reference and charged currency.

**Secrets**
- `PAYSTACK_SECRET_KEY` requested through the secure form.
- Public key kept in code (it is publishable).
- Old `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` left in place, unused, until you confirm the switch works.

## Verification

- Test-mode card payment on a two-vendor order: order flips to paid, both vendor shares appear in the Paystack split, ledger balances update.
- Webhook replay with a bad signature is rejected with 400.
- A vendor without a payout account still checks out, with funds held at platform level.
- M-Pesa, bank transfer, and cash on delivery remain untouched.

## Out of scope

- Automatic conversion of existing Stripe-connected vendors — they re-enter bank details once.
- Refunds through the admin UI (Paystack dashboard refunds still work).
- Going live: needs Paystack business verification, which you complete in their dashboard.
