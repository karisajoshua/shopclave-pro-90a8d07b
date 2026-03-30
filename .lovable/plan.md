

## Add Real-Time Site Analytics to Admin Dashboard

Based on your screenshot, you want visitor analytics (visitors, pageviews, views/visit, duration, bounce rate) with breakdowns by source, page, country, and device — plus a visitor trend chart.

### Architecture

The Lovable platform provides analytics data via an internal API. To surface it in your admin dashboard:

1. **Edge function** (`get-analytics`) — server-side proxy that calls the Lovable analytics API using the project ID and API key, then returns the data to the frontend. Accepts `startDate`, `endDate`, and `granularity` parameters. Admin-only (validates JWT + admin role).

2. **Analytics section on AdminDashboard** — a new tab or section at the top of the existing dashboard page showing:
   - **Stat cards row**: Visitors, Pageviews, Views Per Visit, Visit Duration, Bounce Rate
   - **Visitor trend chart**: Line chart (recharts `LineChart`) with daily data points
   - **Breakdown tables** (2x2 grid): Source, Page, Country, Device — each showing a horizontal bar + count, matching the screenshot's style
   - **Time range selector**: Last 7 days / 30 days / 90 days dropdown

3. **Auto-refresh**: `refetchInterval: 30000` on the react-query hook so data updates every 30 seconds.

### Files

| File | Action |
|------|--------|
| `supabase/functions/get-analytics/index.ts` | Create — edge function fetching analytics |
| `src/pages/admin/AdminDashboard.tsx` | Modify — add analytics section above existing sales dashboard |

### Edge Function Details

- Accepts `{ startDate, endDate, granularity }` via POST
- Verifies the caller is an authenticated admin using the JWT + `has_role` check
- Calls the Lovable analytics endpoint with the project ID (`0dcababf-37ff-4237-bd5e-9900c8f1432b`) and `LOVABLE_API_KEY`
- Returns structured JSON: `{ stats, timeseries, breakdowns }`

### Dashboard UI

The analytics section will render at the top of AdminDashboard with a "Site Analytics" heading, styled with the same card/border pattern used throughout the dashboard. The visitor trend will use a `LineChart` (matching the screenshot's line graph). Breakdown tables will use colored horizontal bars with percentage-based widths.

