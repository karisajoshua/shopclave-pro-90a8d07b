

# Fix: Order Placement Edge Function Errors

## Root Causes

1. **Wrong env var in edge function**: The `create-order` function uses `Deno.env.get("SUPABASE_PUBLISHABLE_KEY")` (line 48), but in the Deno edge function runtime the anon key is available as `SUPABASE_ANON_KEY`. This causes authentication to fail silently.

2. **Payment method validation mismatch**: The checkout page allows selecting `"vendor_payment"` (line 316), but the edge function Zod schema only accepts `["mpesa", "card", "cod"]` (line 26). This causes a 400 validation error.

3. **Expired auth session**: The console shows `Invalid Refresh Token` — the user's session expired. The app should handle this gracefully by redirecting to login instead of showing a generic error.

## Changes

### File: `supabase/functions/create-order/index.ts`
- **Line 26**: Add `"vendor_payment"` to the `payment_method` enum: `z.enum(["mpesa", "card", "cod", "vendor_payment"])`
- **Line 48**: Change `SUPABASE_PUBLISHABLE_KEY` to `SUPABASE_ANON_KEY`
- Add `console.error` logging in the catch block so errors appear in edge function logs for debugging

### File: `src/pages/CheckoutPage.tsx`
- In `handlePlaceOrder`, check if the user session is valid before calling the edge function. If not, redirect to `/auth` with a toast message like "Please sign in again"

## Technical Details
- The env var fix is critical — without it, the Supabase client can't authenticate the user JWT
- Adding `"vendor_payment"` to the Zod enum aligns the edge function validation with the checkout UI options
- These are small targeted fixes — no database changes needed

