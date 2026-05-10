-- Serah terima in this workflow records the current shift and the next shift.
-- Rename the earlier "previous" column to the intended "next" column.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_reports'
      AND column_name = 'previous_shift_staff'
  )
  AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'daily_reports'
      AND column_name = 'next_shift_staff'
  ) THEN
    ALTER TABLE public.daily_reports
    RENAME COLUMN previous_shift_staff TO next_shift_staff;
  END IF;
END $$;

ALTER TABLE public.daily_reports
ADD COLUMN IF NOT EXISTS next_shift_staff jsonb NOT NULL DEFAULT '[]'::jsonb;
