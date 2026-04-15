

# Make "People Viewing" Count Dynamic

## Summary
Update the viewer count logic so it changes more frequently — every few minutes instead of every hour — by using a finer time granularity in the seed and adding a `setInterval` to re-calculate it live while the user is on the page.

## Changes (single file: `src/pages/ProductDetailPage.tsx`)

1. **Finer time seed**: Change the time component from hourly (`/ 3600000`) to every 2–3 minutes (`/ 150000`), so returning to the page after a few minutes shows a different number.

2. **Live updating with `setInterval`**: Add a `useState` + `useEffect` that recalculates the viewer count every 30–45 seconds while the user is on the page. This creates a subtle live feel — the number ticks up or down naturally.

3. **Smooth transitions**: The count will change by small increments (±1–3) each tick rather than jumping wildly, making it feel realistic.

## Technical Detail
- A `useEffect` with `setInterval` (every ~30s) updates viewer count state
- Each tick uses `Date.now()` divided by a smaller interval (~150s) combined with the product ID hash to produce a new deterministic-but-shifting number in the 5–30 range
- Cleanup on unmount to prevent memory leaks

