

# Plan: Search Descriptions, Related Products, Cookie Consent, and Admin Analytics

## Summary
Four changes: (1) Show short product descriptions in search suggestions, (2) Display related products on the product detail page, (3) Add a GDPR-compliant cookie consent banner with tracking, (4) Add an admin analytics section for user/cookie tracking data.

---

## 1. Search Suggestions: Show Short Description

**File: `src/components/layout/SearchSuggestions.tsx`**

- Update the Supabase query to also fetch `description` from the `products` table
- Add `description` to the `Suggestion` interface
- Truncate description to ~80 characters in the dropdown
- Display it as a second line below the product name in smaller, muted text

## 2. Related Products on Product Detail Page

**File: `src/pages/ProductDetailPage.tsx`**

- Add a new query that fetches products in the same `category_id` as the current product, excluding the current product, limited to 8, status = active
- Display them in a horizontal scrollable grid below the reviews section using the existing `ProductCard` component
- Title: "You may also like" or "Related Products"

## 3. Cookie Consent Banner

**New file: `src/components/shared/CookieConsent.tsx`**

- Create a cookie consent banner component that appears at the bottom of the screen
- Three options: "Accept All", "Reject Non-Essential", "Manage Preferences"
- Preferences modal with toggles for: Essential (always on), Analytics, Preferences, Marketing
- Store consent in localStorage under `cookie_consent` key with timestamp and choices
- When user accepts, log consent to a new `cookie_consents` table in the database for compliance records

**Database migration:**
```sql
CREATE TABLE public.cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  session_id text NOT NULL,
  essential boolean NOT NULL DEFAULT true,
  analytics boolean NOT NULL DEFAULT false,
  preferences boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  ip_country text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cookie_consents ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (anonymous users too)
CREATE POLICY "Anyone can log consent" ON public.cookie_consents
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Admins can read all consents
CREATE POLICY "Admins can view consents" ON public.cookie_consents
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
```

**File: `src/App.tsx`** — Add `<CookieConsent />` inside the provider tree so it renders on every page.

## 4. Admin Analytics / User Tracking Section

**New file: `src/pages/admin/AdminAnalyticsPage.tsx`**

- Dashboard showing cookie consent statistics: total consents, breakdown by type (analytics/marketing/preferences acceptance rates), consents over time chart
- Basic user activity metrics derived from existing data (orders, registrations)
- Table of recent cookie consent records

**File: `src/components/admin/AdminSidebar.tsx`** — Add "Analytics" menu item with BarChart icon

**File: `src/App.tsx`** — Add route `/admin/analytics` 

---

## Technical Details

### Database Migration
- Create `cookie_consents` table with RLS

### Files to Create
- `src/components/shared/CookieConsent.tsx`
- `src/pages/admin/AdminAnalyticsPage.tsx`

### Files to Modify
- `src/components/layout/SearchSuggestions.tsx` — Add description to suggestions
- `src/pages/ProductDetailPage.tsx` — Add related products section
- `src/App.tsx` — Add CookieConsent component + analytics route
- `src/components/admin/AdminSidebar.tsx` — Add Analytics nav item

