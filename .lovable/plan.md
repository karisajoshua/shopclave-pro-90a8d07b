## Plan: Plan entitlements view + Team roles & permissions

Two parts:
1. **Plan visibility** — admin can see exactly what each vendor is entitled to based on their active plan.
2. **Team roles** — admin can invite/assign team members to scoped roles (e.g. Orders Manager, Catalog Manager) that only see the admin sections their role permits.

---

### Part 1 — Plan entitlements in admin

**`src/pages/admin/AdminSubscriptions.tsx`**
- Enrich the "All Vendor Subscriptions" table by joining each row to the matching plan in `PLANS` (by `plan_name` key).
- Add a new column "Entitlements" with a "View" button → opens a dialog showing:
  - Plan name, price, listing cap, expiry
  - Full feature checklist from `PLANS[].features` (Check icons)
  - Listing usage: `current_active_products / max_listings` (from `products` count where `vendor_id = X AND status = 'active'`)
- Also add a small "Plan" pill to the existing **Vendors** admin page (`src/pages/admin/AdminVendors.tsx`) showing each vendor's current active plan — quick at-a-glance on the vendor list.

No DB changes needed for Part 1.

---

### Part 2 — Team roles & granular permissions

**Concept**
- Keep core `app_role` enum (`admin`, `vendor`, `customer`) untouched — RLS depends on it.
- Add a **team membership** layer on top: a user with the `admin` role can be a "full admin" OR can be granted a scoped "team role" that limits which admin pages they see.
- The first admin (existing) remains a super-admin. New team members get `admin` role + a team_role that gates the UI.

**New tables (migration)**
```sql
-- Team role definitions (admin can create/edit)
create table public.team_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,           -- e.g. "Orders Manager"
  description text,
  permissions text[] not null default '{}', -- e.g. {'orders.view','orders.update','messages.view'}
  is_system boolean not null default false, -- super_admin built-in
  created_at timestamptz not null default now()
);

-- Assignment of team role to a user
create table public.team_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  team_role_id uuid not null references public.team_roles(id) on delete restrict,
  assigned_by uuid,
  created_at timestamptz not null default now()
);

-- RLS: only admins can read/write
-- has_permission(user, perm) security-definer helper:
-- returns true if user is super_admin OR their team_role.permissions @> ARRAY[perm]
```

Seed system roles: `super_admin` (all perms, `is_system=true`), `orders_manager`, `catalog_manager`, `finance_manager`, `support_agent`, `vendor_manager` — with sensible default perm sets.

**Permission keys** (flat strings, grouped by section):
- `dashboard.view`
- `orders.view`, `orders.update`
- `products.view`, `products.update`, `categories.manage`, `bulk_import.use`, `media.manage`
- `vendors.view`, `vendors.update`
- `users.view`, `users.assign_roles`
- `withdrawals.view`, `withdrawals.update`
- `subscriptions.view`, `subscriptions.update`
- `analytics.view`
- `messages.view`, `evidence.view`, `notifications.send`
- `settings.manage`
- `team.manage` (manage team roles & members — super_admin only by default)

**Frontend changes**

1. **`src/contexts/AuthContext.tsx`**
   - After fetching `userRoles`, also fetch the user's `team_role` + permissions (or "super_admin" if none assigned and they are admin) and expose `permissions: string[]` and `hasPermission(perm)` helper.

2. **`src/components/admin/AdminLayout.tsx`**
   - Already gates on `admin` role. No change to the gate, but now uses `hasPermission` for child routing.

3. **`src/components/admin/AdminSidebar.tsx`**
   - Each sidebar item gets a `permission` field. Filter the rendered groups/items by `hasPermission(item.permission)`.

4. **Per-page gates** — wrap each admin page with a small `<RequirePermission perm="...">` component that redirects to `/admin` (dashboard) with a toast if the user lacks the perm. Apply in `App.tsx` route definitions.

5. **New page `src/pages/admin/AdminTeam.tsx`** (route `/admin/team`, sidebar group "System")
   - **Roles tab**: list `team_roles`, create/edit a role with a checkbox grid of all permissions, delete (blocked if `is_system` or in use).
   - **Members tab**: list users with admin role + their team_role, assign/change team_role via a select, "Invite teammate" flow that:
     - Looks up an existing user by email (from `profiles`), grants them `admin` role in `user_roles`, then inserts into `team_members` with chosen `team_role_id`.
     - If user not found, show a message asking them to sign up first (no auto-invite to keep scope tight).

**RLS for new tables**
- `team_roles`: `SELECT/ALL` only where `has_permission(auth.uid(),'team.manage')`; all admins can `SELECT` (so AdminLayout can resolve perms).
- `team_members`: same — admins can `SELECT` own row + super_admin/team.manage can `ALL`.

---

### Technical notes

- Existing `AdminUsers.tsx` "+ Admin" button keeps working but now grants only base admin role; the super_admin uses the new Team page to attach a scoped team_role. If no team_role is assigned, treat them as super_admin (backwards compatible with the current single-admin setup).
- Sidebar groups become empty for some roles; hide the whole group if all items are filtered out.
- Permission checks are **UI gating only**; data-level safety is still enforced by existing RLS (which keys off `admin`). This is acceptable because team members are trusted staff, not external users — the goal is workflow scoping, not zero-trust isolation. Document this in code comments.

### Files touched

- New: `supabase/migrations/<timestamp>_team_roles.sql`
- New: `src/lib/permissions.ts` (permission key constants + role presets)
- New: `src/components/admin/RequirePermission.tsx`
- New: `src/pages/admin/AdminTeam.tsx`
- Edit: `src/contexts/AuthContext.tsx` (add permissions + hasPermission)
- Edit: `src/components/admin/AdminSidebar.tsx` (filter by perms)
- Edit: `src/App.tsx` (wrap admin routes with RequirePermission, add `/admin/team`)
- Edit: `src/pages/admin/AdminSubscriptions.tsx` (entitlements dialog + usage)
- Edit: `src/pages/admin/AdminVendors.tsx` (plan pill column)
