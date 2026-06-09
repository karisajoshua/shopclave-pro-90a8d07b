The browser tab is still showing "Barakaz | Kenya's best Online Marketplace" because `src/pages/Index.tsx` overrides the static `<title>` via `react-helmet-async` with that wording.

## Fix
In `src/pages/Index.tsx`:
- Change the `<SEO>` title from `"Barakaz | Kenya's best Online Marketplace"` to `"Barakaz | The best Online Marketplace"`
- Change the `<SEO>` description from `"Shop electronics, fashion, home & beauty from thousands of verified Kenyan vendors..."` to `"Shop electronics, fashion, home & beauty from thousands of verified vendors..."` (drop "Kenyan")

This aligns the homepage with the updated branding in `index.html`.