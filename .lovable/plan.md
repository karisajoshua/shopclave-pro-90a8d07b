# Marketing Manager: Hero Banners & Brand Promotions

Give the super admin (and a new "Marketing Manager" role) a dashboard to upload, schedule and reorder homepage hero banners (separate desktop + mobile images) and brand/product promotional cards — with the required image dimensions shown on screen so the right person uploads correctly sized art.

## What changes for the user

### New admin page: `/admin/marketing`
Two tabs:

1. **Hero Banners** — full-width carousel slides at the top of the homepage
   - Upload **desktop image** (1920×600 px, JPG/PNG/WebP, ≤2 MB)
   - Upload **mobile image** (750×500 px, JPG/PNG/WebP, ≤1 MB)
   - Headline (optional), subtitle (optional), CTA label, link URL
   - Display order (drag handle)
   - Active toggle + optional Start/End date for scheduling
   - Live preview swatch with the spec overlay

2. **Promotions** — brand & product advertising cards shown below the hero
   - Type: **Brand** (logo + tagline) or **Product Spotlight** (image + price tag + link)
   - Image (square 600×600 px for brand, 800×800 px for product, ≤1 MB)
   - Title, subtitle, link URL
   - Section placement: "Featured Brands" or "Sponsored Products"
   - Display order, active toggle, scheduling

Each upload form shows a clear spec card:
```text
Desktop hero
- Size: 1920 × 600 px
- Format: JPG, PNG or WebP
- Max file size: 2 MB
- Safe area: keep text within center 60%
```

### Homepage changes
- `HeroBanner` reads slides from the database (falls back to current static slides if none exist).
- Picks the **mobile image at <768 px** and **desktop image otherwise** via `<picture>`.
- New "Featured Brands" strip and "Sponsored Products" rail render below the hero when promotions exist.

### Permissions / roles
- Add a new permission `marketing.manage` and a seeded **Marketing Manager** team role with only that permission + `dashboard.view`.
- Sidebar gains a "Marketing" entry under a new "Content" group, visible only to users with `marketing.manage`.
- Super admins (no team membership) keep full access automatically.

## Technical details

### Database (new migration)
```sql
create table public.hero_banners (
  id uuid primary key default gen_random_uuid(),
  title text,
  subtitle text,
  cta_label text,
  link_url text not null default '/',
  desktop_image_url text not null,
  mobile_image_url text,
  display_order int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('brand','product')),
  placement text not null check (placement in ('featured_brands','sponsored_products')),
  title text not null,
  subtitle text,
  image_url text not null,
  link_url text not null default '/',
  display_order int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hero_banners enable row level security;
alter table public.promotions enable row level security;

-- Public read of active + within schedule
create policy "Public can read live banners" on public.hero_banners
for select using (
  is_active and (starts_at is null or starts_at <= now())
                and (ends_at is null or ends_at > now())
);
create policy "Public can read live promotions" on public.promotions
for select using (
  is_active and (starts_at is null or starts_at <= now())
                and (ends_at is null or ends_at > now())
);

-- Marketing managers (and super admins via has_permission fallback) manage rows
create policy "Marketing can manage banners" on public.hero_banners
for all to authenticated
using (public.has_permission(auth.uid(), 'marketing.manage'))
with check (public.has_permission(auth.uid(), 'marketing.manage'));

create policy "Marketing can manage promotions" on public.promotions
for all to authenticated
using (public.has_permission(auth.uid(), 'marketing.manage'))
with check (public.has_permission(auth.uid(), 'marketing.manage'));
```

Seed a `Marketing Manager` row in `team_roles` with permissions `{dashboard.view, marketing.manage}`.

### Storage
Reuse the existing public `product-images` bucket under a `marketing/` prefix (no extra bucket needed). Files are uploaded via the standard supabase-js upload path.

### Code changes
- `src/lib/permissions.ts` — add `MARKETING_MANAGE = "marketing.manage"` and a new "Content" group with that permission.
- `src/components/admin/AdminSidebar.tsx` — new "Content" group with a "Marketing" item.
- `src/App.tsx` — new route `/admin/marketing` wrapped in `RequirePermission perm={PERMISSIONS.MARKETING_MANAGE}`.
- `src/pages/admin/AdminMarketing.tsx` (new) — Tabs for Banners / Promotions with create/edit dialogs, drag-to-reorder, active toggle, and a `BannerSpecCard` component showing the required dimensions/format/size limits.
- `src/components/marketplace/HeroBanner.tsx` — fetch from `hero_banners`; render `<picture>` with mobile + desktop sources; fall back to current static `HERO_SLIDES` when the table is empty.
- `src/components/marketplace/PromoStrip.tsx` (new) — renders Featured Brands and Sponsored Products rows from `promotions`.
- `src/pages/Index.tsx` — render `<PromoStrip />` below the hero (only when promotions exist).

### Validation on upload
Client-side checks (with friendly toasts) before upload:
- File type ∈ {jpg, png, webp}
- File size under the documented limit
- Image natural dimensions match the required size (warn if off by >10%, block if drastically wrong)