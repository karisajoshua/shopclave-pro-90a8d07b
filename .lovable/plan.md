## Problem

Search engines and browser tabs still show the old favicon because:

1. `public/favicon.ico` still exists and is the **old icon**. Browsers and search engines (Google, Bing) request `/favicon.ico` by default, which overrides the newer `favicon.png`.
2. `index.html` does not declare a `<link rel="icon">` tag — only `apple-touch-icon`. Without an explicit icon link, browsers fall back to `/favicon.ico`.
3. Search engines aggressively cache favicons (Google can take days/weeks to refresh even after the file is replaced).

## Fix

1. **Delete** the stale `public/favicon.ico`.
2. **Generate a fresh `.ico`** from the current `public/favicon.png` (multi-size: 16, 32, 48) so legacy clients get the new icon at `/favicon.ico`.
3. **Update `index.html` `<head>`** to explicitly declare the icon, with a cache-busting query string so browsers refetch:
   ```html
   <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png?v=2" />
   <link rel="icon" type="image/x-icon" href="/favicon.ico?v=2" />
   <link rel="apple-touch-icon" href="/favicon.png?v=2" />
   ```
4. **Note for the user**: Google's search results favicon is cached server-side. Even after this fix, the old icon may persist in Google search for several days until Googlebot recrawls. Browser tab favicons will refresh after a hard reload (Cmd+Shift+R).

## Files Touched

- `public/favicon.ico` — regenerated from `favicon.png`
- `index.html` — add explicit `<link rel="icon">` tags with cache-bust

## Question

Is the current `public/favicon.png` the **correct new logo** you want to use? If yes, I'll regenerate `favicon.ico` from it. If you want a different image, please upload it.