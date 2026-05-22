## Plan

**Email logo:** Done — re-uploaded current `barakaz-logo.png` to the `email-assets` bucket. All 6 auth email templates already reference that URL, so new sends will show the updated logo (no redeploy needed).

**Hero section (needs build mode):**
1. Copy the 5 uploaded images into `src/assets/hero-banner-1.png` … `hero-banner-5.png` (Marchesi Fashion, Fashion Collection, Kids Fashion, Electronic Store, Smart Watch).
2. Update `HERO_SLIDES` in `src/components/marketplace/HeroBanner.tsx` to 5 slides with links:
   - 1 → `/search?category=fashion`
   - 2 → `/search?category=fashion`
   - 3 → `/search?category=kids`
   - 4 → `/search?category=electronics`
   - 5 → `/search?category=smartwatches`
3. Import `heroBanner5` and add it alongside the existing 4 imports.

**Note:** These are the *fallback* banners. If you've added hero banners in Admin → Marketing → Hero Banners, the database ones override these. To use the new images, either delete the DB banners or upload these images there.

Switch to build mode to apply the hero changes.