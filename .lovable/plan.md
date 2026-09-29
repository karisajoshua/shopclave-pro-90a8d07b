# Stripe live webhook verification — read-only findings

Nothing was changed. No secrets, database, code, settings or deployments were touched.

## 1. Has a real signed LIVE event from we_1UKohID9RzF0xESf1MnFnbNd passed validation?

**Yes — verified at 00:30:55 UTC, 29 Sep 2026.**
- Processed-events row: event `evt_1UKowdD9RzF0xESfcOUNaDJJ`, type `customer.created`, **livemode true**, customer `cus_VLVyzfigd62jRl`.
- A row is only written after the signature check passes and processing finishes, and the code then returns 200.
- The function started up at 00:30:55. No errors were logged.
- The HTTP status log came back empty, so our side doesn't directly show the 200. Stripe's delivery log for this event will show it.
- No orders, labels or emails were affected. That event type is only recorded.

## 2. Safe test method (no orders, labels or emails)

How the function behaves (verified from the code):
- It verifies the signature (HMAC-SHA256, 5-minute tolerance). A bad signature returns 400 and nothing is written.
- It only acts on `checkout.session.completed`, `checkout.session.async_payment_succeeded` and `checkout.session.async_payment_failed`. It also needs an `order_id` that matches a real Stripe order, with the same session ID and amount. Any other event type is just recorded as received and returns 200.
- Shippo labels are only bought when `livemode === true` and a real paid order matches.

**Safe method:** in the Stripe Dashboard (Live mode), open Developers → Webhooks → this endpoint → **Send test event**. Pick a harmless type such as `customer.created` or `product.created`, NOT `checkout.session.*`. Expected result: 200 `{"received":true}`. That proves the live signing secret matches. The only side effect is one row in the processed-events table.
- Don't use `stripe trigger checkout.session.completed` in live mode. It creates a real charge.
- If the response is 400 "Invalid signature", the stored `STRIPE_WEBHOOK_SECRET` doesn't match this live endpoint's signing secret.

**Where to check delivery:** Stripe Dashboard → Webhooks → endpoint → Event deliveries (response code and body). On our side: backend function logs for `stripe-webhook`, plus the processed-events table (I can query this read-only on request).

## 3. Seller Connect functions

- **seller-stripe-webhook** needs the secret `STRIPE_CONNECT_WEBHOOK_SECRET`. **Now present** (verified 00:42 UTC, 29 Sep 2026 — 10 backend secrets in total). The secret's value was not read or shown. It handles only the `account.updated` event: charges_enabled, payouts_enabled and details_submitted go to `record_seller_stripe_account_event`. Other events are ignored with 200. In Stripe, register it as a **Connect** endpoint ("Events on connected accounts") at `.../functions/v1/seller-stripe-webhook`, with its own signing secret.
- **seller-stripe-connect** needs `STRIPE_SECRET_KEY`. Live keys also need `STRIPE_LIVE_CONNECT_ENABLED="true"`, which is not set, so it's blocked. It also needs `SELLER_ONBOARDING_RETURN_URL` (https), which is **still missing** (re-verified 00:42 UTC). On top of that, a reviewed `seller_country_requirements` row with `stripe_connect_enabled=true` must exist for the seller's country and business type.

## 4. Remaining blockers before real live checkout

1. `STRIPE_LIVE_CHECKOUT_ENABLED` is not set, so live charges stay blocked (by design until you approve).
2. Live webhook signature proven (customer.created, livemode true, 00:30:55 UTC 29 Sep 2026). Now re-subscribe the endpoint to the real order events (checkout.session.completed / async_payment_succeeded / async_payment_failed).
3. The `STRIPE_SECRET_KEY` mode (test or live) must match the endpoint's mode. I did not reveal or check the prefix.
4. Connect: `STRIPE_CONNECT_WEBHOOK_SECRET` is now set; `SELLER_ONBOARDING_RETURN_URL` is still missing, the live Connect flag is off, and seller country rules haven't been reviewed.
5. No Shippo tracking webhook secret. After the first live paid order, labels will be bought for real, so sellers need real weights/dimensions and addresses.
6. Stock reservations are not yet part of order creation, so overselling is possible.
7. BC, QC, MB and SK are still blocked for tax. GST/HST collection starts 2026-09-25 (now in effect).
8. The frontend hasn't been published with the latest checkout/tax changes. That needs your explicit authorization.

## Next step if approved
Nothing is run automatically. After you send the harmless test event, I'll check the logs and the processed-events table read-only to confirm it arrived with livemode true.

## 5. Seller onboarding return URL (read-only check, 00:45 UTC)

**Recommended value:** `https://barakaz.com/vendor/register`

- Live routing checked: `barakaz.com/vendor/register` returns 200. `www.barakaz.com` and `shopclave-pro.lovable.app` both redirect (302) to `https://barakaz.com/vendor/register`, so barakaz.com is the primary domain.
- That address shows the new seller onboarding flow (the old signup page is no longer used). It is the same page that starts Stripe onboarding, and `seller-stripe-connect` uses the same URL for both return and refresh.
- Return is partly handled: when the page loads, it reloads the saved application and payout-account status, so a seller who comes back sees their draft again. It does not read any return or refresh markers from the address, and it shows no "welcome back / verifying" message.
- Refresh isn't handled on its own: if Stripe's link expires, the seller lands on the same page and has to click "Start secure payout onboarding" again to get a fresh link. That works, but it isn't automatic.
- Payout status only updates when a signed Connect `account.updated` event reaches `seller-stripe-webhook`. The Connect webhook secret is now set, but that endpoint hasn't been verified with a real event.
- Signed-out sellers get sent to sign in and then back to this page.

**Setting it:** my tools can store this value as a backend secret without showing any existing secret (it's a fixed, non-sensitive URL). I haven't set it. Optional later improvement: add a `?stripe=return` / `?stripe=refresh` marker so the page can show a confirmation or open a fresh link automatically.
