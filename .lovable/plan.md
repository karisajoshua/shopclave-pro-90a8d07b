

# Fix order confirmation emails not sending

## Root cause

Orders are being placed successfully, but **zero rows ever appear** in `email_send_log` for `order-confirmation`, and the `send-transactional-email` Edge Function has **no log entries** corresponding to those orders. That means the email-send block inside `create-order` is being skipped entirely.

The cause is in `supabase/functions/create-order/index.ts`:

```ts
const recipientEmail = user.email;
if (recipientEmail) {  // ← silently skipped when user.email is null
  await fetch(...);
}
```

Two real problems:

1. **`user.email` is empty for many sessions.** Google-OAuth users and users whose email is not in the JWT `email` claim come back from `auth.getUser()` with `email: null`. The block is silently bypassed.
2. **Even when the fetch runs, there's no response check.** If `send-transactional-email` returns 401/500/anything non-2xx, the code logs nothing and the order returns success. That's why we can't see what's going wrong.

There's also a smaller issue: the `user_id` is the canonical recipient, but we never look it up in the `profiles` table or `auth.users` as a fallback, so we miss every email that isn't on the JWT.

## Fix

### 1. Resolve recipient email reliably (`create-order/index.ts`)

Order of resolution:
1. `user.email` from the JWT (current behavior)
2. If empty, fetch from `auth.admin.getUserById(user.id)` using the admin client — this always has the verified email
3. If still empty, fall back to the `shipping_address` if it contains an `email` field (we'll add an optional `email` to the checkout schema as well)
4. If none of the above, log a warning explaining no email was sent — but still return order success

### 2. Make the email send observable (`create-order/index.ts`)

Replace the bare `await fetch(...)` with:
- Capture the `Response` and check `res.ok`
- On non-2xx, read the body and `console.error` with status, body, recipient, order id
- On success, `console.log` confirming enqueue
- Wrap in try/catch as today (never fails the order)

This way, the next failed send shows up in the edge function logs immediately and we can diagnose without guessing.

### 3. Allow optional buyer email at checkout (`CheckoutPage.tsx` + `create-order` schema)

Add an **optional "Email for order updates"** field to the checkout shipping form (prefilled from `user.email` if present, editable). Pass it through to `create-order`, validate as `z.string().email().optional()`, and use it as the highest-priority recipient. This guarantees the buyer always controls where the receipt goes, even if their auth account has no email on file.

### 4. Backfill confirmation emails for the 5 recent orders that didn't get one

After the fix is deployed, send a one-off confirmation for each of the 5 orders placed today (21:45, 21:40, 20:59, 11:40, 11:29 UTC) so those buyers actually get their receipt. This is run server-side via the same `send-transactional-email` function with each order's data — idempotency keys prevent duplicates if already sent.

## Files touched

```text
supabase/functions/create-order/index.ts
  - Add OrderSchema.shipping_address.email (optional)
  - Resolve recipient: form email → user.email → auth.admin.getUserById → profiles
  - Check fetch response status and log failures with full context
  - Log success on enqueue

src/pages/CheckoutPage.tsx
  - Add optional "Email for order updates" input, prefilled from auth user

(one-off) Backfill script run inside an exec call
  - For each of the 5 recent orders missing a confirmation email,
    invoke send-transactional-email with the proper templateData
```

## Out of scope
- Vendor "new order received" email
- Shipped / delivered notifications

