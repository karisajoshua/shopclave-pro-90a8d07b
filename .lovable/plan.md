# Fix Stripe checkout handoff

## Confirmed diagnosis
- The latest attempt created one pending CAD order for **CA$38.87** and successfully attached a Stripe Checkout session.
- No payment intent was created, so no card page was reached and no payment occurred.
- The pending-order email was sent during order creation, before the browser handoff.
- The remaining failure is the browser handoff from Lovable's framed preview: the current code waits for two server calls, then tries to navigate the parent window. Framed previews can block that delayed cross-origin navigation.

## Implementation
1. Open a secure payment tab/window immediately from the customer's **Pay with Stripe** click, while the browser still recognizes the user action.
2. Show the existing branded “Preparing secure checkout…” screen in that temporary page while the order and Stripe session are prepared.
3. Once Stripe returns its validated `stripe.com` URL and the CAD amount matches checkout, navigate that already-opened page to Stripe Checkout.
4. On normal published pages, keep a reliable same-tab redirect; use the pre-opened page only where framing requires it.
5. If order creation, Stripe initialization, URL validation, or amount validation fails, close the temporary page and show a clear retry message stating that no charge occurred.
6. Persist the pending order identifier for the current cart during retries/reloads, then clear it after verified payment or when the cart changes, preventing repeated pending orders and emails.
7. Keep the cart until payment is verified. Keep Paystack hidden and preserve support for historical Paystack orders.

## Verification
- Test the full click-to-Stripe handoff in the Lovable mobile preview without entering card details.
- Confirm Stripe Checkout displays the same CAD total as Barakaz.
- Confirm failed/repeated attempts reuse the pending order instead of creating another.
- Confirm no payment, vendor credit, or shipping-label purchase occurs during navigation testing.
- Run focused tests, type checks, and verify the preview build and browser console.
