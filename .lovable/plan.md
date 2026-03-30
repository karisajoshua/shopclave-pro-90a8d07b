

## Fix: Missing Database Trigger + Login Error Clarity

### Root Cause Analysis

**Issue 1 — Can't see other users**: There's only 1 user in the system (you). The `handle_new_user()` function exists but the **trigger on `auth.users` is missing** — it was likely lost during a migration. Without this trigger, any new users who sign up won't get a profile or customer role created, making them invisible in the admin panel.

**Issue 2 — Login error**: The auth logs show "Invalid login credentials" errors. Since your account was created via Google OAuth, it has no password set. Attempting to log in with email/password will always fail. This isn't a bug per se, but the error message could be more helpful.

### Plan

**Step 1: Recreate the missing trigger** (database migration)
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```
This ensures every new sign-up (email or Google) automatically gets a profile and "customer" role.

**Step 2: Backfill any orphaned users** (database migration)
Insert profiles and customer roles for any `auth.users` entries that are missing from the `profiles` table. Currently there's only 1 user and they already have a profile, but this future-proofs the system.

**Step 3: Improve login error UX** (code change in `AuthPage.tsx`)
When a user gets "Invalid login credentials", add a hint suggesting they may have signed up with Google and should use the Google button instead. This reduces confusion for OAuth-only accounts.

### Technical Details
- File changed: `src/pages/AuthPage.tsx` — enhance error message handling
- Database: 1 migration to recreate the trigger on `auth.users` and backfill missing profiles
- No RLS changes needed — admin SELECT policy on profiles is already correct

