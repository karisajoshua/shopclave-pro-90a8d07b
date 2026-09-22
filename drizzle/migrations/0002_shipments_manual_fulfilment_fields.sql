ALTER TABLE public.shipments
  ADD COLUMN IF NOT EXISTS fulfilment_mode text NOT NULL DEFAULT 'integrated',
  ADD COLUMN IF NOT EXISTS manual_carrier text,
  ADD COLUMN IF NOT EXISTS manual_tracking_number text,
  ADD COLUMN IF NOT EXISTS manual_booking_reference text,
  ADD COLUMN IF NOT EXISTS manual_booked_at timestamptz;