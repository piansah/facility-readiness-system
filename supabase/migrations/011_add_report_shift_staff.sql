-- Store shift handover staff snapshots on each daily report.
-- These are snapshots, not live joins, so historical PDFs keep the original names.

ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS current_shift_staff jsonb NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS previous_shift_staff jsonb NOT NULL DEFAULT '[]'::jsonb;
