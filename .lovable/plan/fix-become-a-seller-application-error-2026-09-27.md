# Fix "Become a Seller" application error

## What I checked
- The live form is the simple seller form (store name, phone, description, WhatsApp, website). The newer multi-step form is switched off.
- Database permissions for creating a store look correct. A signed-in user is allowed to submit their own application, and the automatic store-link step works.
- Each account can only ever have **one** store. If someone submits again (a second click, or they already applied earlier), the database rejects it and the user sees a technical "duplicate key" error. This is the most likely cause, but I haven't confirmed it yet because the exact error message wasn't captured.

## Plan
1. **Confirm the cause first.** Reproduce the submit with a test account and capture the exact error. If it turns out to be something else, fix that instead and tell you what it was.
2. **Check for an existing application when the page opens:**
   - Pending: show "Your application is under review" instead of the form.
   - Approved: send them to the seller dashboard.
   - Rejected: show that status and how to contact support.
3. **Stop double submissions.** Disable the button while sending, and treat "already applied" as a friendly message, not an error.
4. **Plain-language errors.** Replace raw database messages with clear ones, like a missing field or a session that has expired.
5. **Wait for sign-in to load** before sending anyone to the login page, so signed-in users aren't bounced away by mistake.

## Technical details
- File: `src/pages/LegacyVendorRegisterPage.tsx` only. No database changes, no change to approval rules or who can create a store.
- On mount, run `vendors.select('id,status').eq('user_id', user.id).maybeSingle()`. Map Postgres `23505` to "already applied". Use `loading` from `useAuth` to guard the redirect.
