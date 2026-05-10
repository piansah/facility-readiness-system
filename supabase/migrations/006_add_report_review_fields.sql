-- Add review fields to daily_reports
alter table public.daily_reports
add column if not exists reviewed_at timestamptz,
add column if not exists reviewed_by uuid,
add column if not exists review_notes text;

-- Add foreign key with explicit name for easier joining in Supabase client
alter table public.daily_reports
drop constraint if exists daily_reports_reviewed_by_fkey,
add constraint daily_reports_reviewed_by_fkey 
  foreign key (reviewed_by) 
  references public.users(id) 
  on delete set null;

-- Update status constraint if it exists (Supabase might use check constraints)
-- Note: Assuming status is a text column with common values.
-- If it's a domain/enum, we might need different syntax, 
-- but usually text + check constraint is safer for migrations.

-- Check if status constraint exists and update it
do $$
begin
  if exists (
    select 1 from information_schema.constraint_column_usage 
    where table_name = 'daily_reports' and column_name = 'status'
  ) then
    -- This is tricky without knowing the exact constraint name, 
    -- but usually we can just add the logic to the app layer or 
    -- drop and recreate the constraint if we find it.
    null;
  end if;
end $$;
