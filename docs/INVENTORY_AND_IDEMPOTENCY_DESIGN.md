# Server-authoritative inventory & duplicate-order design (DRAFT — not applied)

## Current state (inspected)
- `create-order` reads `products.stock` / `product_variants.stock` and rejects if quantity > stock (check-only).
- Stock is never decremented or reserved; two concurrent buyers can both pass the check (oversell).
- Duplicate orders are limited client-side only (sessionStorage pending-order reuse by signature + cart fingerprint). No server idempotency key.
- Paid state comes only from signed Stripe/Paystack webhooks (idempotent via `webhook_events`).

## Proposed additive schema (migration draft, review before applying)
1. `orders.idempotency_key text` + partial unique index `(user_id, idempotency_key) WHERE idempotency_key IS NOT NULL`.
2. `stock_reservations(id, order_id, product_id, variant_id, quantity, status reserved|committed|released, expires_at, created_at)`, unique `(order_id, product_id, variant_id)`. GRANT to service_role only; RLS enabled, no browser policies.
3. RPC `reserve_order_stock(_order_id uuid, _lines jsonb)` SECURITY DEFINER, EXECUTE revoked from anon/authenticated, granted to service_role:
   - `SELECT ... FOR UPDATE` on each product/variant row in a stable id order (deadlock-safe).
   - available = stock − sum(active reservations); fail the whole transaction if any line short.
   - insert reservations with `expires_at = now() + 30 min` (matches Stripe session/quote lifetime).
4. `commit_order_stock(_order_id)` — called from verified-paid webhook: decrement stock, mark committed; no-op if already committed (replay-safe).
5. `release_order_stock(_order_id)` — on async_payment_failed, session expired, cancellation; plus pg_cron sweep of expired reservations.

## create-order changes
- Accept `Idempotency-Key` header (client generates once per cart signature; reused on retry).
- If an order exists for (user, key) and is unpaid with matching fingerprint → return it; never insert twice.
- Insert order + items + reserve stock in one RPC transaction (not multiple PostgREST calls).

## Stock release rules to confirm before build
- Offline methods (COD/vendor payment): commit at placement or at vendor acceptance?
- Refund/return: restock only after inspection "received" — admin decision.
- Stripe session expiry webhook (`checkout.session.expired`) needs adding to the endpoint.

## Test strategy
- SQL tests in a draft/branch DB: two concurrent reservations for the last unit → exactly one succeeds.
- Replay commit/release twice → stock changes once.
- Expired reservation sweep restores availability.
- create-order retry with same key → same order id, one set of reservations.
- Paystack + Stripe webhook regression suites stay green.
