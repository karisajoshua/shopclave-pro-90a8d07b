## Goal

Build a public webhook endpoint that receives background location pings from your Natively iOS app and stores the **latest** coordinates per user in Lovable Cloud.

## How it fits together

```
Natively iOS app
   │  (locationService.startBackground with responseId = supabase user UUID)
   ▼
POST https://fyfeyolecqnpriwjgzyo.supabase.co/functions/v1/natively-geolocation
   Header: X-Webhook-Secret: <NATIVELY_WEBHOOK_SECRET>
   Body:   { responseId, latitude, longitude, ... }
   ▼
Edge Function validates secret, upserts row
   ▼
public.user_locations (one row per user_id, always latest)
```

## Database

New table `public.user_locations`:
- `user_id uuid primary key` (matches `auth.users.id`)
- `latitude double precision`
- `longitude double precision`
- `accuracy double precision` (nullable)
- `recorded_at timestamptz` (when the device captured it, if sent)
- `updated_at timestamptz default now()`
- `raw jsonb` (full payload, for debugging)

RLS:
- Enabled.
- Users can `SELECT` their own row (`auth.uid() = user_id`).
- Admins can `SELECT` all (`has_role(auth.uid(), 'admin')`).
- No client `INSERT/UPDATE/DELETE` policies — only the edge function (service role) writes.

## Edge Function `natively-geolocation`

- `verify_jwt = false` (Natively cannot send a Supabase JWT).
- CORS enabled.
- Validates `X-Webhook-Secret` header against `NATIVELY_WEBHOOK_SECRET`.
- Validates body with Zod: `responseId` (UUID), `latitude` (-90..90), `longitude` (-180..180), optional `accuracy`, optional `timestamp`.
  - Also tolerates Natively's alternate field names (e.g. `lat`/`lng`, `id`) so the same endpoint works regardless of payload shape.
- Uses the **service role key** to `upsert` into `user_locations` keyed on `user_id`.
- Returns `200 { ok: true }` on success, `401` on bad secret, `400` on validation failure.
- Logs minimal info (no coordinates) for debugging.

## New secret you'll need to add

- `NATIVELY_WEBHOOK_SECRET` — a long random string you'll generate and paste into:
  1. Lovable Cloud secrets (used by the edge function).
  2. The Natively background-location request header in your app (`X-Webhook-Secret`).

## What you'll do in Natively

After this is built, in your app code:

```js
const responseId = currentUser.id; // Supabase auth UUID, string
locationService.startBackground(
  60000,           // interval ms
  50,              // minAccuracy
  "Best",          // accuracyType
  "BALANCED",      // android priority
  responseId,
  cb,
  true
);
```

And configure Natively's background-location webhook URL to:
`https://fyfeyolecqnpriwjgzyo.supabase.co/functions/v1/natively-geolocation`
with header `X-Webhook-Secret: <the value you set>`.

## Out of scope (can add later)

- Full location history table / trail visualization.
- Reverse-geocoding to country/city.
- Driving any UI (e.g. vendor live tracking) off these coordinates.
