## Problems

**1. Wrong country detection (some users see Kenya outside Kenya)**

`src/hooks/useLocale.ts` does:
- Calls `ipapi.co/json/` (free tier 1000 req/day, often rate-limited or blocked by ad-blockers/corp networks).
- On any failure → falls back to timezone lookup against a small hardcoded map.
- If timezone isn't in the map → **silently defaults to Kenya**.
- Cache (`localStorage.barakaz_geo_country`) has **no TTL and no version**, so any wrong value sticks forever.

**2. Currency is not actually converted**

The hook only swaps the **symbol** (KSh → $, €, ₦…) but multiplies the same KES number by 1. So a 5,000 KES product shows as `$5,000` to a US viewer (real value ≈ $38). There is no FX rate fetch anywhere in the codebase.

## Fix

### A. Reliable geo detection (`src/hooks/useLocale.ts`)

1. **Multi-provider fallback chain**, first success wins:
   - `https://www.cloudflare.com/cdn-cgi/trace` (parses `loc=XX`, very reliable, no key, not blocked)
   - `https://ipwho.is/` (10k req/day, returns country + currency)
   - `https://ipapi.co/json/` (current — keep as last resort)
2. **Versioned cache with 24h TTL**: store `{ country, ts, v: 2 }`; ignore old/stale entries. Bumping `v` invalidates the bad "Kenya" caches every existing user has.
3. **Never silently default to Kenya.** If all providers fail, leave country `null` and show "Worldwide" / "Select country" in the navbar instead of pretending it's Kenya.
4. **Manual override**: when a user changes country from the navbar dropdown, persist with a different cache key (`barakaz_geo_country_manual`) so it always wins over auto-detection. (The navbar already has the dropdown; we just need to wire `setCountry` properly.)

### B. Real currency conversion (`src/hooks/useLocale.ts` + `src/lib/fx.ts`)

1. New helper `src/lib/fx.ts`:
   - Fetch rates from `https://open.er-api.com/v6/latest/KES` (free, no key, KES base since that's the storage currency).
   - Cache result in `localStorage` with 12h TTL.
2. `useLocale` exposes `formatPrice(amountInKES)` that:
   - Multiplies by the rate for `country.currency`.
   - Rounds sensibly (no decimals for KES/UGX/TZS/JPY; 2 decimals for USD/EUR/GBP).
   - Formats with `Intl.NumberFormat(country.locale, { style: 'currency', currency })`.
3. While rates are loading or if the fetch fails for the user's currency → fall back to KES display (don't show a wrong-by-100x number).

### C. Navbar "Deliver to" (`src/components/layout/Navbar.tsx`)

Already reads `country.name` from `useLocale`, so once (A) is fixed it auto-detects correctly. Small additions:
- Show "Detecting…" while first request is in flight (instead of flashing "Kenya").
- Country dropdown items call a new `setCountry(code)` exposed by `useLocale` that writes to the manual-override cache.

## Files Touched

- `src/hooks/useLocale.ts` — multi-provider detection, TTL cache, real conversion, manual override
- `src/lib/fx.ts` — **new**, FX rate fetch + cache
- `src/components/layout/Navbar.tsx` — "Detecting…" state, wire country dropdown to manual override

## Out of Scope

- Storing prices in multiple currencies in the DB (we keep KES as the base storage currency; conversion is display-only).
- Per-vendor FX overrides.
- Server-side geo (would need an edge function; client-side multi-provider is enough for v1).