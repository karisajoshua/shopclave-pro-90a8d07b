## Goal
On phones (viewport < 768px), the homepage Featured Products grid auto-loads more items as the user scrolls (infinite scroll), and the site Footer is hidden. Desktop/tablet behavior is unchanged (keeps the existing "Load more" button and visible footer).

## Changes

### 1. `src/components/layout/MarketplaceLayout.tsx`
- Use `useIsMobile()` to conditionally render `<Footer />` only when not on mobile.
- Keep `MobileBottomNav` as-is so mobile users still have navigation.

### 2. `src/pages/Index.tsx`
- Add an `IntersectionObserver`-based sentinel at the bottom of the Featured Products grid.
- On mobile (`useIsMobile()` true): when the sentinel enters the viewport, increment `visibleCount` by 10 automatically — no button shown.
- On desktop/tablet: keep the existing "Load more" button (unchanged UX).
- Stop observing once `visibleCount >= displayProducts.length`.
- Skip infinite scroll in the first-run demo state (same condition as the current button).

## Out of scope
- No changes to other pages, no changes to product data fetching (still the same single query of up to 60 featured items — same as today's button-driven pagination).
- No design-token or styling changes.
