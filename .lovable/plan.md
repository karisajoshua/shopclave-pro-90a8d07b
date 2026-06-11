# Convert all images to WebP

Two parts: (1) auto-convert every new image upload to WebP in the browser before it's sent to storage, (2) convert the 48 existing bundled images in `src/assets/` and `public/` to WebP.

## Part 1 — Auto-convert uploads to WebP

Add a small helper `src/lib/imageToWebp.ts` that takes a `File`/`Blob`, draws it on a canvas, and returns a new `File` with `image/webp` MIME and `.webp` extension. Configurable quality (default 0.85) and max-dimension downscale (default 2000px, preserves aspect) so giant phone photos shrink too. Non-image files (PDFs, docs, audio, video) pass through unchanged. SVGs and GIFs also pass through (animated GIF → WebP requires libraries; SVG is already tiny).

Wire it into every storage upload site so all new images land in storage as `.webp`:

- `src/components/chat/AttachmentButton.tsx` (file/photo attachments)
- `src/components/media/MediaLibrary.tsx` (vendor + admin media library)
- `src/pages/vendor/AddProductPage.tsx`, `EditProductPage.tsx` (product images + variations)
- `src/pages/vendor/VendorSettings.tsx` (store logo + banner)
- `src/pages/admin/AdminCategories.tsx` (category images)
- `src/pages/admin/AdminMarketing.tsx` (hero banners, promo strip)
- `src/pages/admin/AdminProducts.tsx` (admin product editor)
- `src/pages/admin/AdminResources.tsx` (resource thumbnails)
- `src/components/shared/BulkProductImport.tsx` if it uploads images

At each site: run the file through the helper, then upload the returned WebP file with `contentType: "image/webp"` and a `.webp` storage path. CSV bulk imports that reference remote URLs are untouched (we don't re-host them).

## Part 2 — Convert existing bundled images

48 PNG/JPG/JPEG files in `src/assets/` (including `src/assets/categories/`) and any in `public/`. Convert each in place to `.webp` using `sharp` (run once via a Node script in the sandbox — not added as a project dep), then update every `import` and string reference across the codebase from `.png`/`.jpg`/`.jpeg` → `.webp` and delete the originals. SVGs and ICOs are left as-is. Favicon stays as-is (browser compatibility).

Build is verified green at the end.

## Notes / trade-offs

- Browser-side conversion uses the platform `canvas.toBlob("image/webp", q)` — supported in all modern browsers, no new dependencies.
- Images uploaded before this change keep their original extension and continue to work; only **new** uploads become WebP.
- Quality 0.85 + 2000px cap typically yields 60–80% size reduction vs original JPEG/PNG with no visible loss. Happy to tune if you have a preference.
