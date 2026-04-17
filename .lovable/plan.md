

# Subscription Upgrade Flow with M-Pesa Payment Proof

## Summary
Replace the "send admin a notification" upgrade flow with a real payment-proof flow. Vendors pick a plan, see admin's M-Pesa details, pay, and submit the M-Pesa transaction code. The subscription auto-activates as `pending_verification` immediately so they get listing access right away, and admin can verify/reject from the admin panel. Also enforce listing limits per plan, give admins unlimited listings, and surface each vendor's current plan in the Admin → Vendors table.

## Plan Definitions (single source of truth)
A shared constant file (`src/lib/subscriptionPlans.ts`):
| Plan | Price (KSh/mo) | Max Listings |
|---|---|---|
| Free | 0 | 5 |
| Basic | 500 | 10 |
| Standard | 1,500 | 50 |
| Premium | 5,000 | 200 |
| Enterprise | 15,000 | 1,000 |
| Admin | — | Unlimited (`Infinity`) |

## Database Changes (one migration)

1. **`vendor_subscription_payments` table** — stores upgrade payment submissions:
   - `id`, `vendor_id`, `plan_name`, `price`, `max_listings`, `expires_days` (default 30)
   - `payment_method` (default `'mpesa'`), `transaction_code` (text, required)
   - `payer_phone` (text), `notes` (text, optional)
   - `status` (`pending_verification` | `verified` | `rejected`), `admin_notes`
   - `subscription_id` (uuid, set when verified), timestamps
   - **RLS**: vendors can insert/select their own; admins can select/update all.

2. **`platform_settings` seed row** with key `mpesa_payment_details` storing admin's M-Pesa till/paybill/phone (JSON: `{ till_number, paybill, account_name, instructions }`). Admin edits via Admin Settings.

3. **DB trigger on `vendor_subscription_payments`**: when a row is inserted with status `pending_verification`, automatically:
   - Insert a new `vendor_subscriptions` row with `status='active'`, the chosen plan/limits, `expires_at = now + expires_days`, and store its id back in `subscription_payments.subscription_id`.
   - Mark any older active subscriptions for that vendor as `expired`.
   - Notify all admins via `notifications` table.
   
   This gives the vendor instant access while keeping admin verification authoritative.

4. **Trigger on verify/reject UPDATE**: if admin rejects, set the linked subscription's status to `cancelled`.

## Code Changes

### 1. `src/lib/subscriptionPlans.ts` (new)
Exports `PLANS` array and helpers (`getPlanLimit(planName)`, `isAdminUnlimited(roles)`).

### 2. `src/pages/vendor/VendorDashboard.tsx`
- Replace `handleRequestUpgrade` with a new **Upgrade Dialog** (using existing `Dialog` component):
  - Step 1: shows plan summary + admin M-Pesa details fetched from `platform_settings`.
  - Step 2: form for `transaction_code` (required), `payer_phone` (required), `notes` (optional).
  - On submit → insert into `vendor_subscription_payments`. Toast: "Payment submitted! Plan activated. Admin will verify shortly."
- Remove the old notification insert.
- Show a status banner if vendor has a `pending_verification` payment.
- Use `PLANS` from the shared file (replaces hardcoded array).

### 3. `src/pages/vendor/AddProductPage.tsx`
- Before insert, fetch active subscription + count current active listings. If `count >= max_listings`, block with toast: "You've reached your plan limit (X listings). Upgrade to add more."
- Skip the limit check if user has admin role (unlimited).

### 4. `src/pages/admin/AdminVendors.tsx`
- Extend the vendors query to also fetch active subscription per vendor.
- Add a **Plan** column showing `plan_name` + `max_listings` + expiry date.

### 5. `src/pages/admin/AdminSubscriptions.tsx`
- Add a new **"Pending Payments"** section/tab above the existing subscriptions table.
- Lists `vendor_subscription_payments` with status `pending_verification`: shows vendor, plan, amount, M-Pesa code, payer phone, submitted time.
- Actions: **Verify** (sets status `verified`) or **Reject** (sets status `rejected` + cancels subscription). Admin can add notes.

### 6. `src/pages/admin/AdminSettings.tsx`
- Add a **"M-Pesa Payment Details"** section to edit `platform_settings.mpesa_payment_details` (till number, paybill, account name, instructions). This is what vendors see in the upgrade dialog.

### 7. Admin unlimited listings
- In `VendorDashboard.tsx`, if `userRoles.includes('admin')`, show "Unlimited" instead of `X / Y`.
- In `AddProductPage.tsx`, skip limit enforcement for admins.

## Technical Details
- All new tables use proper RLS (vendor own-row + admin-all).
- Trigger uses `SECURITY DEFINER` with locked `search_path = public` per project standards.
- M-Pesa details stored in existing `platform_settings` table (no schema change for it).
- No payment gateway integration — purely manual proof flow as chosen.
- `useQueryClient.invalidateQueries` after submit/verify keeps UI in sync.

