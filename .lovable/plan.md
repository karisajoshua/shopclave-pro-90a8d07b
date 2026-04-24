# Refresh Site Analytics + auto-refresh on a schedule

## What's happening today

The Site Analytics block on the admin Dashboard reads from a single cached row in the database (`site_analytics_cache`). That row was last populated **3 days ago (Apr 21)** through a manual SQL update I ran for you. The page itself already auto-refreshes from the database every 10 seconds and listens for realtime changes — so the UI is fine. The problem is that **nothing is updating the cache row itself.**

The data source is **Lovable's built-in site analytics**, which exposes visitor / pageview / source / country / device numbers for your published site (`shopclave-pro.lovable.app` and `barakaz.com`). There is no public REST endpoint to pull these from your app — only Lovable can read them.

That is why the existing "Refresh data" button just shows a toast saying "ask the AI in chat to refresh." It's a dead-end for the admin user.

## The fix — two parts

### Part 1: Refresh the cache right now

Pull the latest 30-day window of site analytics (visitors, pageviews, bounce rate, session duration, pages-per-visit, top sources, top pages, countries, devices) and write it into `site_analytics_cache`. Once written, the dashboard will reflect it within seconds via the existing realtime subscription — no page reload needed.

### Part 2: Keep it fresh automatically

Add a daily scheduled refresh so the dashboard never goes stale again.

```text
                     ┌──────────────────────────────┐
   pg_cron (daily) ─►│ edge fn: refresh-site-       │
   06:00 UTC         │ analytics                    │
                     └──────────────┬───────────────┘
                                    │ writes JSON
                                    ▼
                     ┌──────────────────────────────┐
                     │ site_analytics_cache (row 1) │
                     └──────────────┬───────────────┘
                                    │ realtime push
                                    ▼
                     Admin Dashboard → Site Analytics block
```

**Component pieces:**

1. **New edge function `refresh-site-analytics`** — service-role function that:
   - Receives a JSON payload of fresh analytics (built into the same shape the UI already expects: `timeSeries.{visitors,pageviews,bounceRate,sessionDuration,pageviewsPerVisit}`, `lists.{source,page,country,device}`).
   - Upserts row id=1 in `site_analytics_cache` with the new `data` and `updated_at = now()`.
   - Requires a shared secret header so it can't be called by anonymous traffic.
   - `verify_jwt = false` (it's an internal job, not a user-facing endpoint).

2. **New secret `ANALYTICS_REFRESH_TOKEN`** — random string used as the auth header for the function. Stored in Supabase secrets.

3. **pg_cron daily schedule** — runs every 24h at 06:00 UTC, calls the edge function via `pg_net` with the secret header. The function itself doesn't fetch from Lovable's analytics (no API), so the cron payload is built from a fallback source we already have in the database:
   - **`vendor_analytics`** table (already tracks views/clicks for your own marketplace).
   - **`audit_logs`** for activity counts.
   - **`profiles`** + **`orders`** for visitor/conversion proxies.

   This gives a continuously-updating "site activity" view sourced from real first-party data we own — no dependency on Lovable's analytics API. It will look slightly different from Lovable's published-site numbers but it will be **live** and **always fresh**.

4. **Manual override path preserved** — when you (the admin) want the *Lovable-sourced* numbers (true unique visitors from the published site), you ask in chat and the AI overwrites the cache with that snapshot. The auto-refresh won't clobber a fresh manual snapshot inside a 1-hour window — the function checks `updated_at` and skips if it was just updated by an admin.

5. **UI tweak in `SiteAnalytics.tsx`** — change the Refresh button behavior:
   - Call the new edge function directly (with the user's session, gated to admins inside the function).
   - On success, the realtime channel pushes the new data within ~1 second.
   - Drop the misleading "ask the AI in chat" toast; replace with a normal success/failure toast.
   - Keep the "Data refreshed Xm ago" indicator (already there).

## Files touched

```text
supabase/functions/refresh-site-analytics/index.ts         (new)
supabase/functions/refresh-site-analytics/deno.json        (new)
supabase/config.toml                                       (add function block, verify_jwt=false)
supabase/migrations/<timestamp>_*.sql                      (new)
  - enable pg_cron + pg_net extensions if not enabled
  - create cron job calling the edge function daily at 06:00 UTC
  - immediate one-shot UPDATE of site_analytics_cache with fresh data
src/components/admin/SiteAnalytics.tsx                     (edit)
  - rewrite handleRefresh to invoke the edge function
  - update toast copy
```

## Secrets needed

- `ANALYTICS_REFRESH_TOKEN` — I'll ask you to set this (just a random string; click Generate when prompted).

## Out of scope

- No changes to the chart visuals, time-frame buttons, or stat-card layout.
- No changes to the dashboard's other widgets (Revenue chart, Top vendors, etc.).
- No integration with third-party analytics providers (Plausible, GA4, etc.) — that's a separate request.
