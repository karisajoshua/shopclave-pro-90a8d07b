

# Fix order email branding: sender name + logo

## Two issues

### 1. From header says "shopclave-pro" instead of "Barakaz"
In `supabase/functions/send-transactional-email/index.ts`, line 8:
```
const SITE_NAME = "shopclave-pro"
```
This was baked in from the original Lovable project name. It's used to build the `From:` header:
```
From: shopclave-pro <noreply@barakaz.com>
```
So buyers see the email come from "shopclave-pro" in their inbox.

**Fix**: Change `SITE_NAME` to `"Barakaz"`. After the change, the From line becomes `Barakaz <noreply@barakaz.com>`.

### 2. The order-confirmation email has no logo
The template (`_shared/transactional-email-templates/order-confirmation.tsx`) renders the brand as a plain text `<Heading>` ("Barakaz") on an orange band — no image. Buyers don't see the actual logo.

**Fix**:
- Copy the existing brand logo (`src/assets/barakaz-logo.png`, used in the navbar) into `public/email-logo.png` so it's served at a stable, publicly reachable URL: `https://barakaz.com/email-logo.png`. Email clients can't load `src/assets/...` (bundled) — they need an absolute HTTPS URL.
- Replace the `<Heading>{SITE_NAME}</Heading>` block in the email header with an `<Img>` tag pointing at that URL, sized appropriately (~140px wide, auto height), centered on the orange header band, with `alt="Barakaz"` as a fallback for clients that block images.
- Keep the existing orange (#ff420e) header background so the white logo (current navbar logo is white-on-transparent) reads cleanly. If the asset isn't already light-on-dark, we use a small white inner pill behind it so it's visible regardless.

## Files touched

```text
supabase/functions/send-transactional-email/index.ts
  - SITE_NAME: "shopclave-pro" → "Barakaz"

public/email-logo.png   (new — copy of src/assets/barakaz-logo.png)

supabase/functions/_shared/transactional-email-templates/order-confirmation.tsx
  - Replace text Heading in header Section with <Img src="https://barakaz.com/email-logo.png" />
  - Keep orange band; size logo to ~140px wide

(deploy) send-transactional-email   (required — Edge Function code change won't take effect until redeployed)
```

## Out of scope
- Auth emails (signup, password reset) — same SITE_NAME fix can be applied later if those also show "shopclave-pro"
- Changing the brand color or layout
- Vendor / shipped / delivered emails (don't exist yet)

