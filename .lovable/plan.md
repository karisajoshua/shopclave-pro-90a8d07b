## Goal

Replace the simple 3‑tab Social Media page with a full Ocoya-style workspace embedded in the admin dashboard, exposing every capability of the Ocoya API: design templates, post planner + calendar, inbox, automation/workflows, AI agents, integrations, ecommerce sync, and assets.

## New layout (inside `/admin/social`)

A nested left sub‑sidebar (mirroring Ocoya's screenshot) on top of the existing admin sidebar. Routes become children of `/admin/social/*`:

```text
/admin/social
├── design        Templates & Sizes (browse + open in Ocoya editor)
├── planner
│   ├── posts     Compose, drafts, scheduled, published list
│   └── calendar  Month/Week calendar view of scheduled posts
├── inbox         Comments / DMs aggregated from connected accounts
├── automation
│   ├── workflows  List, start, pause Ocoya automations
│   └── agents     Ocoya AI agents (caption / hashtag / image)
├── integrations  Connected social profiles + connect-more deep links
├── ecommerce     Pull Barakaz products → 1‑click post / bulk schedule
└── assets        Media library bridge (Barakaz Media + Ocoya assets)
```

The top page header keeps the workspace selector, "Connected as …" indicator, and "Open Ocoya" button.

## Backend (Ocoya proxy)

Expand `supabase/functions/ocoya-proxy/index.ts` whitelist to cover the full public API surface used by the new UI:

```text
GET    /me
GET    /workspaces
GET    /social-profiles
GET    /social-profiles/:id
GET    /post              (with status, from, to, profileId filters)
POST   /post
PATCH  /post/:id
DELETE /post/:id
POST   /post/:id/publish
POST   /post/:id/duplicate

GET    /templates
GET    /templates/:id
GET    /designs
POST   /designs
GET    /designs/:id
DELETE /designs/:id

GET    /assets
POST   /assets
DELETE /assets/:id

GET    /automation
GET    /automation/:id
POST   /automation/:id/start
POST   /automation/:id/pause
GET    /automation/:id/runs

GET    /ai/agents
POST   /ai/caption
POST   /ai/hashtags
POST   /ai/image

GET    /inbox
POST   /inbox/:id/reply
PATCH  /inbox/:id            (mark read / archive)

GET    /analytics/overview
GET    /analytics/posts
```

The proxy keeps:
- Server‑side `admin` role + `social_media.manage` permission re‑check.
- Path/method allow‑list (regex patterns) to prevent abuse.
- Audit logging of all mutating calls into `social_media_post_log`.
- `OCOYA_API_KEY` injected as `X-API-Key`.

If any endpoint above returns 404 from Ocoya (not yet exposed publicly for this account tier), the UI shows an inline "Not available on your Ocoya plan — open in Ocoya" fallback rather than crashing. Endpoints that error universally will be removed from the whitelist after a smoke test.

## Frontend

### Files to create
- `src/pages/admin/social/SocialLayout.tsx` — sub‑sidebar + workspace header + `<Outlet />`
- `src/pages/admin/social/SocialDesign.tsx` — templates grid + sizes + recent designs (opens editor in Ocoya)
- `src/pages/admin/social/SocialPosts.tsx` — current Compose + Scheduled list, redesigned as a 2‑pane editor (left: composer, right: live preview per network)
- `src/pages/admin/social/SocialCalendar.tsx` — month/week calendar with drag‑to‑reschedule (PATCH `/post/:id`)
- `src/pages/admin/social/SocialInbox.tsx` — threaded comments/DMs with reply
- `src/pages/admin/social/SocialWorkflows.tsx` — automation list with start/pause + run history
- `src/pages/admin/social/SocialAgents.tsx` — AI caption / hashtags / image generator (with "Insert into composer")
- `src/pages/admin/social/SocialIntegrations.tsx` — accounts list, replaces old AccountsList
- `src/pages/admin/social/SocialEcommerce.tsx` — product picker → bulk caption/template apply → schedule
- `src/pages/admin/social/SocialAssets.tsx` — Barakaz Media Library bridged with Ocoya `/assets`

### Files to update
- `src/hooks/useOcoya.ts` — add hooks: `useOcoyaTemplates`, `useOcoyaDesigns`, `useOcoyaAssets`, `useOcoyaAutomations`, `useStartAutomation`, `usePauseAutomation`, `useOcoyaInbox`, `useReplyInbox`, `useOcoyaAnalytics`, `useGenerateCaption`, `useGenerateHashtags`, `useGenerateImage`, `usePublishNow`, `useDuplicatePost`.
- `src/pages/admin/AdminSocialMedia.tsx` — becomes a thin redirect to `/admin/social/planner/posts`.
- `src/App.tsx` — register nested `/admin/social/*` routes wrapped by `SocialLayout`.
- `src/components/admin/AdminSidebar.tsx` — keep single "Social Media" entry pointing to `/admin/social`.
- `src/components/admin/social/ComposeForm.tsx` — extended with: rich preview per network, AI assist buttons (calls `/ai/caption`, `/ai/hashtags`), template picker, asset picker from Media Library, multi‑variant per profile.

### Visual style
- Match existing admin look (cards, shadcn) — **not** Ocoya's orange. The reference image is for *layout/feature parity*, not branding. Sub‑sidebar uses existing `admin-sidebar-*` tokens.
- Composer 2‑pane layout, planner calendar uses `react-day-picker` (already installed).

## Database

No schema changes required. Existing tables (`social_media_settings`, `social_media_post_log`) remain. We add a lightweight optional table only if user later wants persisted drafts that aren't yet sent to Ocoya — out of scope for this change.

## Permissions

Continue using single permission `social_media.manage` to gate the entire `/admin/social/*` tree. Sub‑sections do not need their own permissions for now.

## Out of scope

- Building a full design editor inside Barakaz (Ocoya's editor opens in a new tab via deep link).
- Publishing media uploads directly to Instagram/TikTok bypassing Ocoya.
- Billing / plan management (handled in Ocoya).

## Validation steps after build

1. `/admin/social` redirects to `/admin/social/planner/posts`.
2. Sub‑sidebar shows all 8 sections; clicking each loads without error.
3. Workspace selector still persists to `social_media_settings`.
4. Compose → Post now / Schedule still creates an Ocoya post and writes audit log.
5. Calendar shows scheduled posts and drag updates `scheduledAt`.
6. AI agents return content and "Insert into composer" populates the caption.
7. Endpoints that 404 on this Ocoya plan show the inline fallback instead of a red error toast.
