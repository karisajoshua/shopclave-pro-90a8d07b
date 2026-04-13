

# Show Contact Seller to Signed-Out Users with Auth Prompts

## Summary
The Contact Seller section will always be visible (signed in or not). For signed-out users: phone numbers are masked, and clicking any action (call, WhatsApp, chat, follow) prompts them to sign in or register.

## Changes (single file: `src/pages/ProductDetailPage.tsx`)

### SellerInfoSidebar updates

1. **Always render the section** -- remove any `user` guards that hide the component (currently it renders for all since it only checks `vendor`, so no structural change needed).

2. **Mask phone numbers when signed out**: Show e.g. `+234 80** *** ***` instead of the full number. Only reveal the real number to authenticated users.

3. **Gate all interactive actions behind auth check**:
   - **Call / WhatsApp / Website / Chat Now / Follow**: If `!user`, show a toast or small dialog prompting "Please sign in to contact this seller" with a link to `/auth`. Do not execute the action.
   - The buttons remain visible and clickable -- they just redirect to auth instead of performing the action.

4. **Chat Now button** already has handling in `ChatDialog` for unauthenticated users (shows "Please log in" message). Keep that as a fallback but also add the pre-check in the sidebar button itself for consistency.

### Implementation detail
- Add a helper `requireAuth` that checks `user` and either shows a toast with "Sign in to continue" + navigates to `/auth`, or returns true to proceed.
- Wrap `handleCall`, `handleWhatsApp`, `handleWebsite`, `onChatOpen`, and `followMutation.mutate()` calls with this guard.
- For phone display: `user ? vendor.phone : vendor.phone?.replace(/(\d{4})(\d+)/, '$1** *** ***')`.

