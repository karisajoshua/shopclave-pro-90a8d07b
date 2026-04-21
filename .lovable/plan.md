

# Fix order email header — make the logo visible

## Problem
The order confirmation email header has an orange background (`#ff420e`), and the Barakaz logo is also orange/dark on transparent. Result: the logo blends into the band and is barely visible in inboxes.

## Fix
In `supabase/functions/_shared/transactional-email-templates/order-confirmation.tsx`, change the email header from an orange band to a clean **white background** so the orange Barakaz logo reads clearly.

Specifically:
- `header` background: `#ff420e` → `#ffffff`
- Add a subtle bottom border (`1px solid #f3f4f6`) to keep visual separation from the body content
- Keep the logo size (140px wide, auto height) and centered alignment
- Leave the orange brand color (`#ff420e`) on the CTA button and meta box accents — the brand color stays present, just not behind the logo

This matches how most marketplace receipts (Amazon, Jumia) handle their email headers: white background, colored logo, color accents elsewhere.

## Files touched

```text
supabase/functions/_shared/transactional-email-templates/order-confirmation.tsx
  - header style: backgroundColor #ff420e → #ffffff
  - header style: add borderBottom 1px solid #f3f4f6

(deploy) send-transactional-email   (template change requires redeploy)
```

## Out of scope
- Other emails (auth, etc.) — only the order confirmation template is touched
- Logo asset itself — no re-export needed
- Layout / CTA / totals styling

