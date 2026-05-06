## Goal

When a user visits Barakaz on an iPhone (iOS Safari/Chrome on iOS), they get an Apple-style experience: SF-style typography, generous spacing, soft rounded surfaces, translucent "frosted" navigation bars, large iOS-style titles, smooth iOS spring transitions, and tap targets that feel native to iPhone. Android, iPad, and desktop keep the current Amazon/Jumia-inspired layout unchanged.

This is an **iPhone-only visual layer** — not a rebuild. The data, routes, and features stay exactly the same.

## What "Apple experience" means here

- **Typography**: System font stack (`-apple-system, "SF Pro Text", "SF Pro Display"`), tighter letter-spacing on headings, iOS large-title style on top of pages.
- **Color & surfaces**: Lighter, softer backgrounds, increased corner radii (14–20px), subtle hairline borders (0.5px) instead of heavy 1px borders, soft shadows.
- **Top bar**: Translucent blurred header (backdrop-filter blur, semi-transparent white) instead of the dark Amazon bar — only on iPhone.
- **Bottom nav**: Frosted-glass tab bar with SF Symbol-style icons, rounded selected pill, larger safe-area padding.
- **Buttons**: Filled primary buttons with iOS spring press animation, rounded-full secondary buttons, haptic-feel tap feedback (scale 0.97 on press).
- **Lists & cards**: iOS-style grouped cards with inset rounded corners.
- **Sheets/dialogs**: Bottom-sheet style on iPhone (rounded top corners, drag handle look) instead of centered dialogs where it makes sense.
- **Motion**: Use iOS-like easing (`cubic-bezier(0.32, 0.72, 0, 1)`) for transitions.
- **Safe areas**: Respect `env(safe-area-inset-*)` everywhere (notch, home indicator).

## How it will be implemented

### 1. iOS detection
Add a small `useIsIOS()` hook (`src/hooks/use-ios.ts`) that returns `true` for iPhone/iPod (and iPad masquerading as Mac with touch). Add an `ios` class to `<html>` when true so CSS can target `html.ios .selector`.

### 2. iOS theme layer in `src/index.css`
Add a scoped block:

```text
html.ios { font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", ... }
html.ios { --radius: 0.875rem; }      /* 14px */
html.ios body { background: #f2f2f7; } /* iOS systemGroupedBackground */
html.ios .ios-blur { backdrop-filter: saturate(180%) blur(20px); background: rgba(255,255,255,0.72); }
html.ios .ios-hairline { border-color: rgba(60,60,67,0.18); }
```

Plus iOS-specific overrides for buttons, cards, inputs, dialogs.

### 3. Components updated
- `src/components/layout/Navbar.tsx` — on iPhone, render a translucent white blurred bar with centered title and large logo, hide the dark Amazon bar. Tablet/desktop unchanged.
- `src/components/layout/MobileBottomNav.tsx` — frosted glass background, SF-symbol-style icons (lucide already close), selected state uses iOS blue tint pill. Already respects safe-area; we'll increase padding.
- `src/components/ui/button.tsx` — add `ios:` variants via the existing `html.ios` CSS overrides (no API change).
- `src/components/ui/dialog.tsx` / `sheet.tsx` — on iOS, dialogs slide up from the bottom with rounded top corners and a drag handle bar.
- `src/pages/Index.tsx` (homepage) — add an iOS "Large Title" header ("Barakaz") that collapses on scroll, matching iOS navigation pattern.
- `ProductCard`, category grid — softer radii and shadows on iOS.

### 4. Install / "Add to Home Screen"
Already have `apple-mobile-web-app-capable` and `apple-touch-icon` set. Add a one-time, dismissible iOS install hint card on the homepage shown only on iPhone Safari (not when already running standalone), with instructions: "Tap Share → Add to Home Screen". This makes Barakaz feel like a real iPhone app once installed.

### 5. What stays the same
- All routes, queries, auth, vendor logic, RLS — untouched.
- Android, tablet, and desktop UI — untouched.
- Brand color (#ff420e) is preserved as the iOS accent.

## Files to change

- `src/hooks/use-ios.ts` (new)
- `src/main.tsx` (apply `ios` class to `<html>`)
- `src/index.css` (iOS theme layer)
- `src/components/layout/Navbar.tsx`
- `src/components/layout/MobileBottomNav.tsx`
- `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx` (iOS bottom-sheet variant)
- `src/components/marketplace/ProductCard.tsx` (radius/shadow polish)
- `src/pages/Index.tsx` (iOS large title + optional install hint)
- `src/components/shared/IOSInstallHint.tsx` (new, optional)

## Out of scope (ask if you want these too)

- Wrapping as a true native iOS app via Capacitor (separate, larger task).
- Rebuilding admin or vendor dashboards in iOS style (those are desktop-first).
- Replacing all dialogs project-wide with bottom sheets (we'll do the most-used ones; rest stay standard).

## Memory updates

Add a memory: "iOS users get an Apple-style UI layer (translucent nav, SF typography, larger radii, bottom-sheet dialogs). Trigger via `html.ios` class. Android/tablet/desktop unchanged."
