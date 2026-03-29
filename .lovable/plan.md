

## Plan: Withdrawal System, Analytics Dashboard, Top Performers, Footer Update, and Navigation

### Database Changes

**Create `withdrawal_requests` table:**
```sql
CREATE TABLE public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL DEFAULT 'mpesa', -- mpesa, bank_transfer, paypal
  payment_details jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'pending', -- pending, approved, completed, rejected
  admin_notes text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
-- Vendors can view own, insert own; Admins can view all, update all
ALTER PUBLICATION supabase_realtime ADD TABLE public.withdrawal_requests;
```

RLS policies: vendors SELECT/INSERT where vendor matches their own vendor record; admins SELECT/UPDATE all.

### Changes Summary

**1. Vendor Earnings page rewrite** (`src/pages/vendor/VendorEarnings.tsx`):
- Show gross revenue, platform fee, available balance (net earnings minus already-withdrawn/pending amounts)
- Top performing products table (sorted by revenue)
- Withdrawal request form: enter amount, choose payment method (M-Pesa, Bank Transfer, PayPal), enter payment details (phone/account number)
- Withdrawal history table with status badges (pending/approved/completed/rejected)

**2. Vendor Dashboard rewrite** (`src/pages/vendor/VendorDashboard.tsx`):
- Add top selling products section (top 5 by quantity sold)
- Add sales chart placeholder showing recent order activity

**3. Admin Dashboard rewrite** (`src/pages/admin/AdminDashboard.tsx`):
- **Time frame selector**: buttons for Last 24h, 7 days, 30 days, 12 months, + custom date range
- **Revenue chart**: bar/line chart using Recharts showing platform revenue over selected period
- **Platform earnings card**: total revenue, total commission earned, total vendor payouts
- **Top performing vendors**: table showing vendor name, total sales, commission paid, number of orders
- **Top performing products**: table showing product name, vendor name, units sold, revenue generated
- **Recent orders** (existing, keep)

**4. Admin Withdrawals page** (`src/pages/admin/AdminWithdrawals.tsx`):
- List all withdrawal requests with realtime subscription
- Show vendor name, amount, payment method, status, date
- Admin can approve/reject with notes
- Mark as completed after transfer

**5. Admin Sidebar** (`src/components/admin/AdminSidebar.tsx`):
- Add "Withdrawals" menu item with Wallet icon
- Add "Back to Site" link at bottom pointing to `/`

**6. Vendor Sidebar** (`src/components/vendor/VendorSidebar.tsx`):
- Add "Back to Site" link at bottom pointing to `/`

**7. Admin Layout** (`src/components/admin/AdminLayout.tsx`):
- Add "Back to Site" button in header

**8. Footer** (`src/components/layout/Footer.tsx`):
- Add "Powered by Texcortech Systems" text at the very bottom

**9. Routes** (`src/App.tsx`):
- Add `/admin/withdrawals` route

### Files

| File | Action |
|------|--------|
| Migration SQL | Create `withdrawal_requests` table + RLS |
| `src/pages/admin/AdminDashboard.tsx` | Rewrite with analytics, time filters, top performers |
| `src/pages/admin/AdminWithdrawals.tsx` | Create |
| `src/pages/vendor/VendorEarnings.tsx` | Rewrite with withdrawal requests + top products |
| `src/pages/vendor/VendorDashboard.tsx` | Add top products section |
| `src/components/admin/AdminSidebar.tsx` | Add Withdrawals + Back to Site |
| `src/components/vendor/VendorSidebar.tsx` | Add Back to Site |
| `src/components/admin/AdminLayout.tsx` | Add Back to Site button in header |
| `src/components/layout/Footer.tsx` | Add "Powered by Texcortech Systems" |
| `src/App.tsx` | Add withdrawals route |

### Technical Notes
- Revenue charts use Recharts (already available via shadcn chart component)
- Time frame filtering done client-side for simplicity, with date range passed to Supabase queries
- Withdrawal amounts validated against available balance (net earnings - pending/completed withdrawals)
- Realtime on `withdrawal_requests` so admin sees new requests instantly

