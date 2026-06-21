## Goal

Make the sidebar's top-level categories appear instantly when the user opens the menu — no "Loading…" flash.

## Approach

Prefetch + cache top-level categories so they're already in React Query's cache by the time the sidebar opens.

### Changes

1. **`src/components/layout/MegaMenu.tsx`**
   - Remove the `enabled: open` gate on the top-level query — fetch it as soon as the component mounts (the Navbar mounts `SidebarMenu` on every page, so this runs once at app load).
   - Bump `staleTime` to `Infinity` for top-level (taxonomy roots rarely change in a session) and keep 5 min for deeper levels.
   - Add `placeholderData` / `initialData: []` so the empty state doesn't flash before the first fetch resolves.

2. **`src/App.tsx`** (or wherever `QueryClientProvider` is set up)
   - On app mount, call `queryClient.prefetchQuery` for `["sidebar-children", "root"]` so the request fires in parallel with the rest of the page load, not when the user clicks the hamburger.

### Why this is enough

The top-level query is ~14 rows and already returns in <200 ms. Firing it at app start instead of at sheet-open means the data is cached before any user interaction. Sub-level fetches stay lazy (on expand) — they're not the bottleneck the user is complaining about.

No DB, RLS, or styling changes.
