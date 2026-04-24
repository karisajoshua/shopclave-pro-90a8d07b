# Fix: Vendor plans should activate only after admin approval

## Problem
When a vendor submits a M-Pesa payment for a paid plan, they immediately get full access to that plan (e.g. higher listing limit) before the admin has verified the M-Pesa code. The activation is happening in a database trigger that fires on INSERT of the payment row, regardless of payment status.

## Root cause
In migration `20260417082414_...sql`, the trigger `handle_new_subscription_payment` runs `BEFORE INSERT` on `vendor_subscription_payments` and unconditionally:
1. Expires the vendor's current active subscription
2. Inserts a brand-new row in `vendor_subscriptions` with `status = 'active'`

So the moment the vendor types any M-Pesa code, they are upgraded — even though the payment is still `pending_verification`.

## Fix overview
Move plan activation from "payment submitted" to "payment verified by admin". Submission only records the payment + notifies admins. Verification by an admin is what creates the active subscription.

## Steps

### 1. Database migration — change trigger behavior

- **Rewrite `handle_new_subscription_payment()`** so on INSERT it only:
  - Sends a notification to all admins
  - Does NOT touch `vendor_subscriptions` and does NOT set `subscription_id`
  - Does NOT expire the existing active subscription (so the vendor keeps whatever plan they had — typically free — until verified)

- **Rewrite `handle_subscription_payment_status_change()`** so on UPDATE:
  - When `status` transitions to `verified`: expire the vendor's current active subscription, insert a new active `vendor_subscriptions` row using the payment's plan/listings/price/expires_days, and update the payment's `subscription_id` to point to it.
  - When `status` transitions to `rejected`: do nothing to subscriptions (there's nothing to cancel because no sub was created on submission). Just leave the payment row marked rejected.

- **One-time data cleanup**: For any existing `vendor_subscriptions` row whose linked payment in `vendor_subscription_payments` is still `pending_verification`, set that subscription's `status` to `cancelled`. This rolls back any vendors who were auto-activated under the old behavior and are still waiting on admin review.

### 2. Vendor dashboard UX (`src/pages/vendor/VendorDashboard.tsx`)

- Change the success toast on payment submission from "Your plan is active. Admin will verify shortly." to: "Payment submitted. Your plan will activate once admin verifies your M-Pesa code." 
- The existing "Pending payment" banner already covers the awaiting-verification state, and the listing-limit display already reads from the active `vendor_subscriptions` row, so it will correctly show the vendor's old (free) plan limits until approval.

### 3. Admin side — no UI changes needed
`AdminSubscriptions.tsx` already updates `vendor_subscription_payments.status` to `verified` or `rejected` via the review action. With the new trigger logic, that update will be what creates the active subscription.

## Out of scope
- No changes to plan pricing, payment form, or M-Pesa details
- No changes to RLS policies
- No new admin UI — the existing verify/reject buttons drive the activation

## Files touched
- New SQL migration replacing both trigger functions and cleaning stale data
- `src/pages/vendor/VendorDashboard.tsx` (toast copy only)
