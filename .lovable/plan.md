

## Plan: Enhanced Categories, Bulk Import Templates, and Admin Settings

### Overview
Three main areas: (1) Redesign admin categories page with CRUD, image upload, and seed automotive data, (2) Add Excel template download to bulk import, (3) Build a fully functional admin settings page with platform-wide controls.

### Database Changes

**Migration 1 -- Platform settings table + Automotive categories seed:**
```sql
-- Platform settings table (key-value store for admin config)
CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings (needed for frontend to apply them)
CREATE POLICY "Settings readable by everyone" ON public.platform_settings
  FOR SELECT USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage settings" ON public.platform_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) 
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Seed default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('default_commission_rate', '"10"'),
  ('platform_name', '"Barakaz"'),
  ('support_email', '"support@barakaz.com"'),
  ('currency', '"KES"'),
  ('min_order_amount', '"0"'),
  ('free_shipping_threshold', '"5000"'),
  ('vendor_auto_approve', '"false"'),
  ('maintenance_mode', '"false"');
```

**Migration 2 -- Seed Automotive category + subcategories:**
Insert top-level "Automotive" category and subcategories (Car Parts, Tires & Wheels, Car Electronics, Interior Accessories, Exterior Accessories, Oils & Fluids, Tools & Equipment, Motorcycle Parts) into the `categories` table with appropriate slugs and placeholder image URLs.

### 1. Admin Categories Page Redesign

Rewrite `src/pages/admin/AdminCategories.tsx`:
- **Organized tree view** with category images (thumbnail), expand/collapse per top-level category
- **Add Category dialog** with fields: name, slug (auto-generated), parent (dropdown for subcategory), image upload to `product-images` storage bucket
- **Edit Category** inline or dialog -- update name, slug, image
- **Delete Category** with confirmation dialog
- Categories displayed in a clean card grid (top-level) with expandable subcategories underneath
- Image upload uses Supabase Storage (`product-images` bucket, path: `categories/{slug}.webp`)

### 2. Bulk Import -- Excel + CSV Templates

Update `src/components/shared/BulkProductImport.tsx`:
- Add **two download buttons**: "CSV Template" and "Excel Template"
- Excel template generated client-side using `xlsx` library (SheetJS) -- creates a `.xlsx` file with headers and 2 sample rows, same data as CSV
- Accept both `.csv` and `.xlsx` uploads -- detect file type by extension
- For `.xlsx` files, parse using `xlsx` library (`XLSX.read` → convert first sheet to JSON)
- Add `xlsx` package dependency
- Update file input accept to `.csv,.xlsx,.xls`

### 3. Fully Functional Admin Settings

Rewrite `src/pages/admin/AdminSettings.tsx` with sections:

| Section | Settings |
|---------|----------|
| **General** | Platform name, support email, currency (dropdown) |
| **Commerce** | Default commission rate (%), minimum order amount, free shipping threshold |
| **Vendor Policy** | Auto-approve new vendors (toggle), maintenance mode (toggle) |

- Each setting reads from / writes to `platform_settings` table
- Form with save button per section (or single save all)
- Use `useQuery` to load settings, `useMutation` to upsert
- Toast on save success/failure
- Settings are stored as key-value pairs so they're extensible

### Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create `platform_settings` table + seed automotive categories |
| `src/pages/admin/AdminCategories.tsx` | Full rewrite -- tree view with CRUD + image upload |
| `src/pages/admin/AdminSettings.tsx` | Full rewrite -- functional settings with all controls |
| `src/components/shared/BulkProductImport.tsx` | Add Excel template support + xlsx parsing |
| `src/pages/admin/AdminBulkImport.tsx` | No change needed |
| `src/pages/vendor/VendorBulkImport.tsx` | No change needed |

### Technical Details
- Category image upload uses existing `product-images` bucket with path prefix `categories/`
- Excel generation uses `xlsx` (SheetJS) library -- lightweight, client-side only
- Platform settings use JSONB values so we can store strings, numbers, booleans flexibly
- `platform_settings` table uses `key` as primary key for simple upsert with `.upsert()`
- Automotive subcategories seeded with Unsplash placeholder images

