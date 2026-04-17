

# Fix Favicon Mismatch

## Problem
Search engines / browser tabs show an old favicon instead of the one saved in the project. Looking at `index.html`, there's no `<link rel="icon">` tag at all, so browsers fall back to the default `/favicon.ico` (the old Lovable placeholder).

## Fix
Add an explicit favicon link in `index.html` pointing to the project's saved icon, and remove/replace the default `favicon.ico` so browsers stop loading the stale one.

### Steps
1. Check what icon files exist in `public/` (e.g. `favicon.ico`, any custom logo).
2. Delete the stale `public/favicon.ico` if it's the old default.
3. Add to `<head>` in `index.html`:
   ```html
   <link rel="icon" href="/favicon.png" type="image/png">
   <link rel="apple-touch-icon" href="/favicon.png">
   ```
4. Update `public/manifest.json` icon entry to match (currently points to `/placeholder.svg`).

## One Question
I need to know **which image** to use as the favicon. Options:
- The Barakaz logo already in the project (if you point me to it)
- A new image you'll upload

Please either upload the favicon image you want, or tell me the path to the existing logo in the project to use. Once provided, I'll wire it up across `index.html` and `manifest.json` so it shows everywhere (browser tab, bookmarks, search results, PWA install).

> Note: Search engines like Google cache favicons for days/weeks — even after we fix it, Google search results may take time to refresh.

