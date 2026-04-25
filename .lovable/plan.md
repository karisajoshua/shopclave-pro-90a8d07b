## Vendor Resource Center

A full learning hub for vendors, controlled entirely by the admin. Admins create categories and lessons (videos + images + rich text); vendors browse, search, and track what they've watched.

---

### What the admin gets (Admin → Resource Center)

A new sidebar entry under "Content": **Resource Center** (gated by a new `RESOURCES_MANAGE` permission).

Two tabs:

**1. Categories**
- Create / rename / reorder / delete topic groups (e.g. "Getting Started", "Adding Products", "Orders & Shipping", "Marketing Your Store", "Payments & Withdrawals").
- Each category has: name, slug, icon (lucide picker), description, display order, active toggle.

**2. Resources** (lessons)
- Create / edit / delete / reorder lessons inside each category.
- Each lesson has:
  - Title, short summary, full rich content (markdown / textarea with line breaks).
  - **Cover image** (uploaded to `vendor-resources` storage bucket, recommended 1280×720).
  - **Resource type**: `video`, `article`, or `gallery`.
  - **Video source**: upload a video file to storage **or** paste a YouTube / Vimeo URL (auto-embedded).
  - **Image gallery**: upload multiple step-by-step screenshots with captions.
  - **Attachments**: optional downloadable files (PDF guides, CSV templates).
  - Difficulty level (Beginner / Intermediate / Advanced), estimated read/watch minutes.
  - Tags (comma-separated, for search).
  - Published toggle + featured toggle (featured lessons surface on the vendor dashboard).
- List view: filter by category, search, drag-to-reorder, status badges (Published / Draft / Featured), view counts.

**3. Analytics strip on top**
- Total lessons, total views, most-watched lesson, average completion %.

---

### What the vendor gets (Vendor → Help & Learn)

New sidebar group **"Learn"** with one item: **Help Center** at `/vendor/resources`.

Layout:

```text
┌───────────────────────────────────────────────────────────┐
│ Welcome banner + global search bar ("How do I…?")         │
├───────────────────────────────────────────────────────────┤
│ FEATURED – horizontal cards (admin-flagged lessons)       │
├───────────────────────────────────────────────────────────┤
│ Browse by category – grid of category tiles with counts   │
├───────────────────────────────────────────────────────────┤
│ Recently added · Continue watching · Your progress        │
└───────────────────────────────────────────────────────────┘
```

- **Category page** (`/vendor/resources/c/:slug`): list of lessons in that category with cover thumbnails, duration, difficulty, watched ✓ indicator.
- **Lesson page** (`/vendor/resources/r/:slug`):
  - Hero video player (HTML5 for uploaded files, embedded iframe for YouTube/Vimeo).
  - Rich content body, image gallery (lightbox), downloadable attachments.
  - "Next lesson" suggestion within the same category.
  - "Was this helpful?" thumbs up/down (stored as feedback).
- **Search**: full-text search across title, summary, content, tags.
- **Progress tracking**: when a vendor opens a lesson it's recorded; videos watched ≥ 80% mark as completed. A small "X of Y lessons completed" progress bar shows on the dashboard.

A small **"Help & Tutorials"** card is also added to the **Vendor Dashboard** showing the 3 featured lessons + a "Browse all guides" link, so vendors discover it immediately.

---

### Database (new tables, all RLS-protected)

1. **`resource_categories`** — id, name, slug, description, icon, display_order, is_active, timestamps.
2. **`resources`** — id, category_id, title, slug, summary, content (text), resource_type (video/article/gallery), cover_image_url, video_url, video_provider (upload/youtube/vimeo), attachments (jsonb array), tags (text[]), difficulty, duration_minutes, display_order, is_published, is_featured, view_count, timestamps.
3. **`resource_images`** — id, resource_id, url, caption, position (for galleries).
4. **`resource_progress`** — id, user_id, resource_id, status (viewed/completed), progress_percent, last_viewed_at — unique on (user_id, resource_id).
5. **`resource_feedback`** — id, resource_id, user_id, helpful (bool), created_at.

**RLS:**
- Admins / users with `resources.manage` permission: full CRUD on categories, resources, images.
- Authenticated vendors (any logged-in user, since vendors are users with a vendor row): SELECT on `is_active` categories and `is_published` resources only.
- Vendors: insert/update only their own `resource_progress` and `resource_feedback`.

**Storage:** new public bucket **`vendor-resources`** for cover images, gallery images, video files, and attachments. Uploads restricted to users with the manage permission via storage RLS.

---

### Permissions / routing

- Add `RESOURCES_MANAGE = "resources.manage"` to `src/lib/permissions.ts` under a new "Learning" group, and grant it to admins by default.
- Add admin route `/admin/resources` → `AdminResources` page, sidebar entry under Content.
- Add vendor routes `/vendor/resources`, `/vendor/resources/c/:slug`, `/vendor/resources/r/:slug` → new pages, sidebar entry under a new "Learn" group.

---

### Files to add

- `supabase/migrations/<ts>_resource_center.sql` (tables, RLS, bucket, policies)
- `src/pages/admin/AdminResources.tsx`
- `src/pages/vendor/VendorResources.tsx` (hub)
- `src/pages/vendor/VendorResourceCategory.tsx`
- `src/pages/vendor/VendorResourceDetail.tsx`
- `src/components/resources/ResourceCard.tsx`
- `src/components/resources/VideoPlayer.tsx` (handles upload, YouTube, Vimeo)
- `src/components/resources/ResourceGalleryDialog.tsx`

### Files to edit

- `src/lib/permissions.ts` — add `RESOURCES_MANAGE` + group.
- `src/components/admin/AdminSidebar.tsx` — add Resource Center entry.
- `src/components/vendor/VendorSidebar.tsx` — add Learn group with Help Center.
- `src/App.tsx` — register all new routes.
- `src/pages/vendor/VendorDashboard.tsx` — add "Help & Tutorials" promo card linking to featured lessons.

---

After approval I'll generate the migration, build the admin manager, the vendor-facing hub with player + progress tracking, and seed a couple of starter categories so the section is not empty on first load.