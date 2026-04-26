## Social Media Marketing (Ocoya) — Admin Section

Add a new **Social Media** module in the admin dashboard that lets admins compose, schedule, list, update and delete posts across their connected social accounts (Instagram, Facebook, X, LinkedIn, TikTok, etc.) using the **Ocoya API**. All API calls go through a Supabase Edge Function so the API key stays server-side (Ocoya explicitly forbids client-side use).

---

### What the user gets

A new sidebar entry **Social Media** under the **Content** group, with three tabs:

1. **Compose & Schedule** — write caption, attach images from the existing Media Library (or paste URLs), pick which social profiles to post to, and either save as draft or schedule for a future date/time. Optionally pre-fill from a selected product (uses product title, description, and first image).
2. **Scheduled & Drafts** — paginated list of upcoming/draft posts pulled from Ocoya, with edit / delete actions and status badges (draft, scheduled, published, failed).
3. **Connected Accounts** — read-only list of social profiles connected in Ocoya (network, handle, avatar). Includes a "Connect more accounts" button that deep-links to the user's Ocoya workspace, since social accounts are linked inside Ocoya itself, not here.

A status banner at the top shows the connected Ocoya workspace name; a settings icon lets the admin switch workspace if more than one exists.

---

### Workflow

```text
Admin → /admin/social
  ├─ Compose tab
  │    caption + media + profiles + schedule date
  │    "Post now" / "Schedule" / "Save draft"
  │       → Edge function `ocoya-proxy` → POST /post
  ├─ Scheduled & Drafts tab
  │    list → Edge function → GET /post (with workspaceId)
  │    edit → PATCH /post/:id   delete → DELETE /post/:id
  └─ Connected Accounts tab
       → Edge function → GET /social-profiles
```

---

### Permissions & access control

- New permission key: `SOCIAL_MEDIA_MANAGE` ("social_media.manage") added to `src/lib/permissions.ts` and to the **Content** group of `PERMISSION_GROUPS` so it shows up in the Team & Roles editor.
- Route `/admin/social` gated with `<RequirePermission perm={PERMISSIONS.SOCIAL_MEDIA_MANAGE}>` exactly like Marketing/Resources.
- Sidebar entry only renders if the user has the permission (existing `AdminSidebar` filter logic).
- Edge function additionally re-checks: it calls `has_role(auth.uid(), 'admin')` AND `has_permission(auth.uid(), 'social_media.manage')` before forwarding any request to Ocoya.

---

### Data model (one new table + one settings row)

`public.social_media_settings` — single-row table holding workspace selection and metadata cache:

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| workspace_id | text | currently selected Ocoya workspace |
| workspace_name | text | for display |
| last_synced_at | timestamptz | |
| updated_by | uuid | references auth user |
| updated_at | timestamptz | trigger-managed |

RLS: only users with `admin` role (and `social_media.manage` permission) can read/update. No vendor or customer access.

`public.social_media_post_log` — audit trail of admin actions (compose, schedule, delete) so we can investigate who scheduled what:

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | actor |
| ocoya_post_id | text | id returned by Ocoya |
| action | text | created / updated / deleted |
| payload | jsonb | snapshot |
| created_at | timestamptz | |

RLS: insert via SECURITY DEFINER function, select restricted to admins.

The Ocoya API itself is the source of truth for posts — we do not mirror the post list in our DB.

---

### Edge function: `ocoya-proxy`

A single thin proxy function in `supabase/functions/ocoya-proxy/index.ts`:

- Validates the caller's JWT, then checks admin role + permission via the existing `has_permission` RPC.
- Reads `OCOYA_API_KEY` from Supabase secrets.
- Accepts `{ method, path, query, body }` from the client and forwards to `https://app.ocoya.com/api/_public/v1{path}` with the `X-API-Key` header.
- Whitelists allowed paths: `/me`, `/workspaces`, `/social-profiles`, `/post`, `/post/:id`, `/automation`, `/automation/:id`, `/automation/:id/start`, `/automation/:id/pause`. Anything else → 403.
- Logs every mutating call (POST/PATCH/DELETE) into `social_media_post_log` via the service-role client.
- Returns `{ status, data }` to the caller, including CORS headers.

`supabase/config.toml` gets `verify_jwt = true` for this function (we explicitly want a logged-in admin).

---

### Frontend pieces

New files:
- `src/pages/admin/AdminSocialMedia.tsx` — page with Tabs (Compose / Scheduled / Accounts) and the workspace banner.
- `src/components/admin/social/ComposeForm.tsx` — caption textarea (10k char counter), media picker (reuses `MediaLibrary`), profile multi-select chips, schedule date/time, "Pre-fill from product" combobox.
- `src/components/admin/social/ScheduledList.tsx` — table/cards of posts with status badges, edit dialog, delete confirm.
- `src/components/admin/social/AccountsList.tsx` — grid of connected profiles.
- `src/hooks/useOcoya.ts` — typed wrapper around `supabase.functions.invoke('ocoya-proxy', …)` plus React Query queries: `useOcoyaProfiles`, `useOcoyaPosts`, `useCreatePost`, `useUpdatePost`, `useDeletePost`, `useWorkspaces`, `useMe`.

Edits:
- `src/lib/permissions.ts` — add `SOCIAL_MEDIA_MANAGE` and group entry.
- `src/components/admin/AdminSidebar.tsx` — add **Social Media** under **Content** group with `Share2` icon.
- `src/App.tsx` — register `/admin/social` route gated by the new permission.
- `src/pages/admin/AdminDashboard.tsx` (optional) — small "Schedule a post" quick-action card.

---

### Setup steps (in order, after approval)

1. Create the migration: new permission grant for default admin role (`*` already covers it), `social_media_settings`, `social_media_post_log`, RLS policies, and `updated_at` trigger.
2. Add `SOCIAL_MEDIA_MANAGE` permission constant + group.
3. Add the `/admin/social` route, sidebar link, and page shell.
4. Request the **OCOYA_API_KEY** secret from you (you mentioned `4559e13f-0734-417c-b8cb-fb842ed1d93a` in the message — once approved I'll send the secret-add prompt so you can paste the real key from https://www.app.ocoya.com/general/settings/api).
5. Implement the `ocoya-proxy` Edge Function with admin/permission check, whitelist, and logging.
6. Build the Compose / Scheduled / Accounts UI wired through the React Query hooks.
7. After deploy, you visit Social Media → it auto-calls `/me` and `/workspaces`, you pick the active workspace, and you can compose your first scheduled post.

---

### Notes / limits worth knowing

- Ocoya rate-limits API calls; we surface 429s as a toast and back off.
- Connecting new social accounts (OAuth to Instagram/Facebook/etc.) must happen inside the Ocoya app; we link out to it. The API only exposes already-linked profiles.
- Media uploaded via our Media Library must be publicly reachable URLs (Ocoya fetches them) — the existing `product-images` and `marketing-assets` buckets are already public, so they work; the private `chat-attachments` bucket will not.
