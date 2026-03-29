

# Add Google Sign-In

## Overview
Enable users to sign up and log in using their Google account via Lovable Cloud's managed Google OAuth.

## Steps

1. **Configure Social Auth** — Use the Configure Social Login tool to generate the `src/integrations/lovable/` module with `@lovable.dev/cloud-auth-js`. This sets up the managed Google OAuth flow automatically (no API keys needed).

2. **Update AuthPage** — Add a "Sign in with Google" button to `src/pages/AuthPage.tsx`:
   - Import `lovable` from `@/integrations/lovable/index`
   - Add a Google button that calls `lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin })`
   - Style it consistently with the existing form (full-width, with a Google icon)
   - Place it above or below the email form with an "OR" divider

3. **Update Navbar account link** — No changes needed; the existing auth state listener in `AuthContext` will pick up Google-authenticated sessions automatically.

## Technical Details
- Lovable Cloud manages Google OAuth credentials — no setup in Google Cloud Console required
- The `onAuthStateChange` listener in `AuthContext.tsx` already handles session changes, so Google sign-ins will work seamlessly
- The `handle_new_user` trigger will auto-create a profile and assign the `customer` role for new Google users

