

## Plan: Fix Commission Rate Propagation and Withdrawal Form Fields

### Problem 1: Commission Rate Not Taking Effect
The admin's `default_commission_rate` in `platform_settings` only affects new vendors. Existing vendors keep their original `commission_rate` value in the `vendors` table. When admin changes it, nothing updates the vendors table.

**Fix:** When saving settings, if `default_commission_rate` changed, also update all vendors' `commission_rate` in the `vendors` table. Add a confirmation note in the UI that this applies to all vendors.

**File:** `src/pages/admin/AdminSettings.tsx`
- After saving platform settings, run `supabase.from("vendors").update({ commission_rate: newRate })` to apply globally
- Add a note under the commission field: "Changing this will update ALL existing vendors"

### Problem 2: Withdrawal Form Needs Dynamic Fields
Currently a single `paymentDetail` text field is used for all methods. Bank transfer needs multiple fields (account name, bank name, branch, account number, SWIFT code). PayPal needs an email input.

**Fix:** Replace single `paymentDetail` state with a `paymentDetails` object. Render different form fields based on selected payment method.

**File:** `src/pages/vendor/VendorEarnings.tsx`
- Replace `paymentDetail` string state with `paymentDetails` object state
- When payment method changes, reset the details object
- Render method-specific fields:
  - **M-Pesa**: Phone number input
  - **Bank Transfer**: Account name, bank name, branch, account number, SWIFT code (5 fields in a grid)
  - **PayPal**: Email input with `type="email"`
- Update mutation to send the full `paymentDetails` object
- Adjust form layout to stack vertically for bank transfer's extra fields

### Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminSettings.tsx` | Propagate commission rate to all vendors on save |
| `src/pages/vendor/VendorEarnings.tsx` | Expand withdrawal form with method-specific fields |

