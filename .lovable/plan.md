

## Mobile Navbar Redesign — Amazon-Style Layout

Based on the reference screenshot, the mobile navbar (`< md` breakpoint) needs to be restructured into a stacked layout:

**Row 1** (dark bg): Hamburger menu | Barakaz logo | "Sign in >" text | User icon | Cart icon with badge

**Row 2** (dark bg): Full-width search bar with orange search button

**Row 3** (lighter bar): MapPin icon + delivery location text (currently hidden on mobile)

The secondary category nav bar will be hidden on mobile since the bottom nav already handles navigation.

### Changes (single file: `src/components/layout/Navbar.tsx`)

1. **Mobile top row**: Restructure the main nav so on mobile it shows hamburger, logo, "Sign in >" link, user icon, and cart — all in one compact row without the search bar.

2. **Mobile search row**: Move the search bar to a second row below, spanning full width with horizontal padding — matching the Amazon mobile pattern.

3. **Show location bar on mobile**: The "Deliver to [Country]" section (currently `hidden md:flex`) will become a third row visible on mobile, styled as a slim bar with MapPin icon and country name.

4. **Hide secondary category bar on mobile**: The category links bar (`Today's Deals`, `Electronics`, etc.) will be hidden on mobile (`hidden md:flex`) since the bottom nav and hamburger menu cover navigation.

5. **Desktop stays unchanged**: All changes are wrapped in responsive classes so the desktop layout remains identical.

### Technical approach
- Use `md:hidden` / `hidden md:flex` classes to swap between mobile stacked layout and current desktop single-row layout
- No new components needed — just restructuring the JSX with responsive wrappers
- The `MobileBottomNav` component remains as-is

