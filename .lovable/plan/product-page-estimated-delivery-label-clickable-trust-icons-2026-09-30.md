# Product page: "Estimated delivery" label + clickable trust icons

## Build
- In `src/pages/ProductDetailPage.tsx` delivery option row (~line 570), change the label "Estimated arrival" to "Estimated delivery". The date text stays unchanged.
- Make each TrustStrip item (Secure payments, Buyer protection, Returns, Canadian support) a clickable button that opens a dialog with a short factual explanation and, where a real page exists, a link:
  - Secure payments — checkout is processed over a secure connection; link to the existing FAQ/help info.
  - Buyer protection — how orders and seller contact work on Barakaz; link to Help Center.
  - Returns — the existing 7-day voluntary returns; link to the existing Return Policy page (/returns).
  - Canadian support — support channels; link to the existing Contact page (/contact).
- Content is limited to existing, real Barakaz policies — no invented guarantees, dates, or claims.
- Reuse the existing shadcn Dialog; on mobile it behaves as a bottom-sheet-friendly centered dialog consistent with the current UI. Buttons get proper aria labels and visible hover/focus states; layout of the strip stays exactly as it is now (4 columns on mobile, rows on desktop).

## Verification
- Targeted test: trust items render as buttons and open dialogs; delivery label reads "Estimated delivery".
- Run the full test suite (baseline 163 passing), TypeScript check, and check the build log.
- Inspect the page at desktop and mobile sizes via the preview.

## Scope safeguards
- No changes to purchase logic, variants, cart, checkout, shipping quotes, SEO, or backend.
- No fabricated policy content or guarantees.
