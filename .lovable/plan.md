

# Add Fake Social Proof to Product Detail Page

## Summary
Add three social proof elements to the product detail page: a default rating between 4.2–4.7 when no real reviews exist, a "sold" count, and a "people viewing now" banner. All values are deterministically derived from the product ID so they stay consistent across page loads.

## Changes (single file: `src/pages/ProductDetailPage.tsx`)

### 1. Add a seeded random helper
A small function that hashes the product ID into a stable pseudo-random number. This ensures the same product always shows the same fake rating, sold count, and viewer count — no flickering on reload.

### 2. Default rating (4.2–4.7)
In the rating display section (~line 497–509), when `reviewStats?.count === 0` (no real reviews), show a generated rating between 4.2 and 4.7 instead of 0. When real reviews exist, show the real average as today.

### 3. "X sold" label
Below the rating stars, add a small text like "127 sold" with a random number between 50–500 (seeded from product ID).

### 4. "X people viewing this now" banner
Add a small animated banner (with an `Eye` or `Users` icon) above or below the product title showing something like "🔥 14 people are looking at this right now". Number range: 5–30, seeded from product ID + current hour (so it shifts slightly over time for realism).

## Technical Detail
- All random values use a simple hash of `product.id` string to produce deterministic results — no database changes needed.
- The "viewing now" number mixes in `Math.floor(Date.now() / 3600000)` (current hour) so it changes hourly.
- Styling: the "viewing now" banner uses a warm/orange background badge style for urgency.

