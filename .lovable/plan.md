

## Plan: Comprehensive Admin/Vendor Dashboards + Notifications + Bulk Import + Mobile App Feel

### Overview
This is a large scope covering: (1) sidebar-based admin dashboard with full vendor control, (2) notifications system, (3) bulk CSV import for products, (4) enhanced vendor dashboard, and (5) mobile-native app feel. We will break it into structured pieces.

### Database Changes (Migration)

Create a `notifications` table for internal admin-to-vendor messaging:
```sql
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL, -- user_id of recipient
  sender_id uuid, -- admin who sent it
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info', -- info, warning, success, alert
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can read their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = recipient_id);

-- Users can update (mark read) their own
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = recipient_id);

-- Admins can insert notifications
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins can view all
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
```

Enable realtime on notifications:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
```

Also add admin SELECT policy on `products` and `order_items` so admin queries work:
```sql
CREATE POLICY "Admins can view all products" ON public.products
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'));
```

### 1. Admin Dashboard Redesign (Sidebar Layout)

Replace the current tab-based `AdminDashboard` with a **sidebar layout** using shadcn `Sidebar` component. The admin area becomes a multi-page routed section under `/admin/*`.

**Sidebar modules:**
- **Dashboard** (`/admin`) -- Overview stats, charts, recent activity
- **Vendors** (`/admin/vendors`) -- Full vendor management (approve/reject/suspend, view details, edit commission rates)
- **Products** (`/admin/products`) -- All products across vendors, can deactivate/feature products
- **Orders** (`/admin/orders`) -- All orders, status tracking, filter by vendor/status/date
- **Categories** (`/admin/categories`) -- View/manage category tree
- **Users** (`/admin/users`) -- View all users, roles management
- **Bulk Import** (`/admin/bulk-import`) -- CSV upload for products
- **Notifications** (`/admin/notifications`) -- Send notifications to all vendors or specific vendors
- **Settings** (`/admin/settings`) -- Platform commission rate, site settings

**New files:**
- `src/components/admin/AdminLayout.tsx` -- SidebarProvider + Sidebar + content area
- `src/components/admin/AdminSidebar.tsx` -- Sidebar with all menu items
- `src/pages/admin/AdminDashboard.tsx` -- Rewrite: overview only
- `src/pages/admin/AdminVendors.tsx` -- Vendor management
- `src/pages/admin/AdminProducts.tsx` -- Product management
- `src/pages/admin/AdminOrders.tsx` -- Order management
- `src/pages/admin/AdminUsers.tsx` -- User/role management
- `src/pages/admin/AdminBulkImport.tsx` -- CSV bulk import
- `src/pages/admin/AdminNotifications.tsx` -- Send notifications
- `src/pages/admin/AdminCategories.tsx` -- Category management

**Routes added to App.tsx:**
```
/admin -- Dashboard overview
/admin/vendors -- Vendor management
/admin/products -- Product management
/admin/orders -- Order management
/admin/users -- User management
/admin/bulk-import -- Bulk import
/admin/notifications -- Notifications
/admin/categories -- Categories
```

### 2. Vendor Dashboard Enhancement (Sidebar Layout)

Similarly convert vendor dashboard to sidebar layout under `/vendor/*`:

**Sidebar modules:**
- **Dashboard** (`/vendor/dashboard`) -- Overview stats
- **Products** (`/vendor/products`) -- Product list with edit/delete/status
- **Add Product** (`/vendor/products/new`) -- Add product form
- **Bulk Import** (`/vendor/bulk-import`) -- CSV upload for products
- **Orders** (`/vendor/orders`) -- Order management with status flow
- **Earnings** (`/vendor/earnings`) -- Revenue breakdown
- **Notifications** (`/vendor/notifications`) -- View notifications from admin (realtime)
- **Store Settings** (`/vendor/settings`) -- Store info editing

**New files:**
- `src/components/vendor/VendorLayout.tsx` -- SidebarProvider + Sidebar
- `src/components/vendor/VendorSidebar.tsx` -- Sidebar menu
- Split existing VendorDashboard tabs into separate page components

### 3. Bulk Import Feature

Shared component `src/components/shared/BulkProductImport.tsx`:
- CSV file upload with drag-and-drop
- Parse CSV client-side using `Papa Parse` (add dependency)
- Preview table showing parsed rows
- Validate required fields (name, price, stock)
- Map CSV columns to product fields
- Insert products in batch via Supabase
- Show success/error count
- Download CSV template button

Available to both admin (can specify vendor_id) and vendors (auto-uses their vendor_id).

### 4. Notifications System

**Admin side** (`AdminNotifications.tsx`):
- Form to compose notification (title, message, type)
- Choose recipients: "All vendors", specific vendor from dropdown
- Send button inserts into `notifications` table
- History of sent notifications

**Vendor side** (`VendorNotifications.tsx`):
- List of received notifications with read/unread state
- Click to mark as read
- Realtime subscription for new notifications (bell icon with badge count in sidebar)

### 5. Mobile App Feel

To make the site feel like a native mobile app:
- Add `<meta name="mobile-web-app-capable" content="yes">` and Apple-specific meta tags to `index.html`
- Add a simple `manifest.json` with `display: "standalone"` (no service worker, just installability)
- Add bottom navigation bar on mobile (Home, Search, Cart, Account) that appears only on `< 768px`
- Create `src/components/layout/MobileBottomNav.tsx` -- fixed bottom bar with icons
- Add smooth page transitions
- Use `safe-area-inset` padding for notch phones
- Touch-friendly tap targets (min 44px)

**Changes to `index.html`:**
```html
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#131921">
<link rel="manifest" href="/manifest.json">
```

**Create `public/manifest.json`:**
```json
{
  "name": "Barakaz",
  "short_name": "Barakaz",
  "display": "standalone",
  "start_url": "/",
  "theme_color": "#131921",
  "background_color": "#f5f5f5"
}
```

### Files Summary

| File | Action |
|------|--------|
| Migration SQL | Create `notifications` table + admin RLS policies |
| `src/components/admin/AdminLayout.tsx` | Create |
| `src/components/admin/AdminSidebar.tsx` | Create |
| `src/pages/admin/AdminDashboard.tsx` | Rewrite (overview only) |
| `src/pages/admin/AdminVendors.tsx` | Create |
| `src/pages/admin/AdminProducts.tsx` | Create |
| `src/pages/admin/AdminOrders.tsx` | Create |
| `src/pages/admin/AdminUsers.tsx` | Create |
| `src/pages/admin/AdminBulkImport.tsx` | Create |
| `src/pages/admin/AdminNotifications.tsx` | Create |
| `src/pages/admin/AdminCategories.tsx` | Create |
| `src/components/vendor/VendorLayout.tsx` | Create |
| `src/components/vendor/VendorSidebar.tsx` | Create |
| `src/pages/vendor/VendorDashboard.tsx` | Rewrite |
| `src/pages/vendor/VendorProducts.tsx` | Create |
| `src/pages/vendor/VendorOrders.tsx` | Create |
| `src/pages/vendor/VendorEarnings.tsx` | Create |
| `src/pages/vendor/VendorNotifications.tsx` | Create |
| `src/pages/vendor/VendorSettings.tsx` | Create |
| `src/pages/vendor/VendorBulkImport.tsx` | Create |
| `src/components/shared/BulkProductImport.tsx` | Create |
| `src/components/layout/MobileBottomNav.tsx` | Create |
| `src/components/layout/MarketplaceLayout.tsx` | Modify (add MobileBottomNav) |
| `src/App.tsx` | Add all new routes |
| `index.html` | Add mobile app meta tags |
| `public/manifest.json` | Create |

### Technical Notes
- Admin/vendor sidebars use shadcn `Sidebar` with `collapsible="icon"` for mini-collapse on mobile
- Bulk import uses `papaparse` library for CSV parsing
- Notifications use Supabase realtime subscriptions
- Mobile bottom nav uses fixed positioning with `pb-16` body padding on mobile
- All admin pages check `has_role(auth.uid(), 'admin')` via the `userRoles` context

