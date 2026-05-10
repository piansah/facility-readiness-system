alter table public.incidents
add column if not exists follow_up_notes text,
add column if not exists official_letter_number text,
add column if not exists resolved_at timestamptz,
add column if not exists followed_up_by uuid references public.users(id) on delete set null,
add column if not exists followed_up_at timestamptz;

create index if not exists idx_incidents_status
on public.incidents(status);

create index if not exists idx_incidents_followed_up_by
on public.incidents(followed_up_by);
