## Problem

Two bugs in the store QR code feature:

1. **"Store not found" when scanned** — QR encodes `https://barakaz.com/store/<slug>`. The apex `barakaz.com` currently returns an HTTP 302 redirect loop (verified via curl), so the page never loads and shows the fallback "Store not found" UI. Only `https://www.barakaz.com` (200 OK) and the lovable preview/published URLs actually serve the app.

2. **Logo missing from downloaded PNG** — The visible on-screen QR uses `qrcode.react`'s `imageSettings.src` with the vendor's remote `logo_url`. When we rasterize the SVG to PNG via `<img>` + `<canvas>`, cross-origin images either taint the canvas (blocking export) or fail to load in the SVG `<image>` tag during rasterization, so the logo is dropped from the downloaded file.

## Fix

### 1. Use a reliably-serving base URL for share/QR links

In `src/components/seo/SEO.tsx`:
- Change `SITE_URL` from `https://barakaz.com` to `https://www.barakaz.com` so all SEO canonical URLs and the QR/share link land on the working host.
- (Canonical URLs are unaffected SEO-wise; Google treats `www` as the canonical host once consistent.)

### 2. Embed the logo into the downloaded PNG correctly

Rewrite `downloadPng` in `src/components/vendor/StoreQRDialog.tsx` so the logo is drawn directly onto the canvas instead of relying on the SVG `<image>` tag:

```text
1. Render QR to canvas at 1024×1024 with white bg (as today, minus the SVG <image>)
2. If logoUrl exists:
     a. fetch(logoUrl) → blob → object URL  (avoids canvas tainting)
     b. Load into Image, draw centered onto a white rounded square (~18% of QR size)
3. canvas.toBlob('image/png') → download
```

Also in the visible QR (`<QRCodeSVG>`):
- Keep `level="H"` (already set) so the QR remains scannable with the centre logo.
- Add `crossOrigin="anonymous"` consideration is moot because we're not exporting the SVG anymore — we render to canvas directly.

### 3. Filename

Keep current filename pattern (`barakaz-<store>-qr.png`).

## Files Changed

- `src/components/seo/SEO.tsx` — update `SITE_URL` to `https://www.barakaz.com`.
- `src/components/vendor/StoreQRDialog.tsx` — rewrite `downloadPng` to draw QR + logo to canvas (with fetch-as-blob for the logo to avoid CORS taint); keep visible SVG QR with logo for preview.

## Out of Scope

- Fixing the apex `barakaz.com → barakaz.com` 302 redirect loop is a DNS/hosting config issue (Cloudflare/Lovable custom domain). I'll note it in the response so you can fix it in domain settings, but the code fix above sidesteps the issue immediately by using `www`.
