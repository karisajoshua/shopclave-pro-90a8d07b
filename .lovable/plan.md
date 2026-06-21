## Problem
1. **Homepage category section** doesn't show **Kids Fashion** because `Index.tsx` queries top-level categories with `.limit(6)` (and `NewArrivalsCategories.tsx` with `.limit(12)`) — there are now 7+ top-level departments, and ordering is unspecified so Kids Fashion gets clipped.
2. **MegaMenu** fetches every category in one shot with no pagination — but the taxonomy has ~9,000 rows and PostgREST caps responses at 1,000 by default, so most subcategories never load. This is the "not all categories show" symptom shoppers see in the nav.
3. **Vendor "Add Product" picker** uses the lazy `CategoryPicker` (fetches direct children per level, capped at 2,000 per level — fine). The likely visible gap there is the same React Query cache hit on stale data; a fresh load already shows Kids Fashion. No code change needed beyond invalidating the cache on next visit.

## Fixes

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Drop `.limit(6)`, add `.order("name")`. Render all top-level departments in the homepage category grid. |
| `src/components/marketplace/NewArrivalsCategories.tsx` | Drop `.limit(12)`, keep `.order("name")`. |
| `src/components/layout/MegaMenu.tsx` | Replace single `select` with a paginated fetch loop (`.range(from, from+999)` until empty) so the full taxonomy (~9k rows) is loaded and the tree is complete. |
| `src/components/shared/CategoryPicker.tsx` | No structural change required — already lazy per level. Confirmed sufficient. |

## Out of scope
- Visual redesign of the homepage category grid or MegaMenu.
- Touching `AdminCategories` (already paginates correctly).
- Pre-fetching all categories on every page — MegaMenu has a 5-minute `staleTime` cache, so the larger payload loads once per session.