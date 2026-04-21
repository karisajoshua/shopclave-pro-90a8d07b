

# Fix: order confirmation email is rejected with 401 (Invalid JWT)

## Root cause

Edge function logs from `create-order` show every email send failing with:

```
send-transactional-email failed: status=401
body={"code":"UNAUTHORIZED_INVALID_JWT_FORMAT","message":"Invalid JWT"}
```

That means the request never reaches our `send-transactional-email` code — Supabase's gateway rejects it before it runs. Two things are causing this:

1. `supabase/config.toml` sets `verify_jwt = true` for `send-transactional-email`. Under the new signing-keys system, the gateway is rejecting the service-role bearer token we're sending.
2. `create-order` is doing a raw `fetch(...)` with `Authorization: Bearer <service_role_key>`. That's the wrong shape for the new JWT verifier and gets refused as "invalid JWT format".

Result: every order today still has zero rows in `email_send_log` for `order-confirmation`, and `send-transactional-email`'s own logs are empty (because nothing actually invoked it).

## Fix

### 1. Stop the gateway from blocking internal calls
Set `verify_jwt = false` for `send-transactional-email` in `supabase/config.toml`. The function is only ever invoked from other edge functions (server-to-server with the service role key) — there's no client-facing surface that needs gateway-level JWT enforcement. This matches how `auth-email-hook`, `handle-email-unsubscribe`, and `handle-email-suppression` are already configured.

### 2. Use the proper SDK to invoke it from `create-order`
Replace the raw `fetch(...)` block in `create-order/index.ts` with `supabase.functions.invoke('send-transactional-email', { body: { ... } })` using a service-role-authenticated Supabase client. This:
- Constructs the auth header in the correct format
- Doesn't depend on URL string-building
- Surfaces a real `error` object we can log cleanly
- Is the pattern Lovable's email infra recommends

We keep:
- The recipient-resolution priority (form email → JWT → `auth.admin.getUserById`)
- The idempotency key (`order-confirm-${order.id}`) so retries can't double-send
- The try/catch wrapper so email failures never fail the order
- The existing detailed error logging

### 3. Redeploy
Deploy `send-transactional-email` (config change) and `create-order` (code change). Until both are deployed, the bug persists.

### 4. Backfill the orders that didn't get an email
After deploy, send the missing confirmations for the recent orders that hit the 401 (3 orders today: `3097d9f7…`, `415937b9…`, `462bbb5f…`, plus any others since the original "missing emails" backfill). Idempotency keys make this safe — already-sent ones won't duplicate.

## Files touched

```text
supabase/config.toml
  - [functions.send-transactional-email] verify_jwt: true → false

supabase/functions/create-order/index.ts
  - Replace raw fetch(send-transactional-email) with
    supabase.functions.invoke('send-transactional-email', { body: ... })
  - Keep try/catch + recipient resolution + detailed error logging

(deploy) send-transactional-email   (config change requires redeploy)
(deploy) create-order               (code change requires redeploy)

(one-off backfill) for the 3+ orders that failed with 401 today,
  invoke send-transactional-email server-side with the same templateData
```

## Out of scope
- Vendor "new order received" email
- Shipped / delivered notifications
- Auth email branding ("shopclave-pro" → "Barakaz" was already fixed last turn)

