-- Dynamic preventive maintenance planning per unit.

create table if not exists public.pm_sections (
  id uuid primary key default extensions.uuid_generate_v4(),
  unit_id uuid not null references public.units(id) on delete cascade,
  name varchar(100) not null,
  color varchar(30) not null default 'amber',
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (unit_id, name)
);

create table if not exists public.pm_points (
  id uuid primary key default extensions.uuid_generate_v4(),
  section_id uuid not null references public.pm_sections(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  code varchar(50) not null,
  name varchar(150) not null,
  location_detail text,
  frequency varchar(30) not null default 'monthly',
  facility_id uuid references public.facilities(id) on delete set null,
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (unit_id, section_id, code)
);

create table if not exists public.pm_schedules (
  id uuid primary key default extensions.uuid_generate_v4(),
  unit_id uuid not null references public.units(id) on delete cascade,
  section_id uuid not null references public.pm_sections(id) on delete cascade,
  point_id uuid not null references public.pm_points(id) on delete cascade,
  assigned_user_id uuid references public.users(id) on delete set null,
  scheduled_date date not null,
  shift public.shift_type,
  status varchar(30) not null default 'planned',
  notes text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pm_sections_unit
on public.pm_sections(unit_id, sort_order);

create index if not exists idx_pm_points_unit_section
on public.pm_points(unit_id, section_id, sort_order);

create index if not exists idx_pm_schedules_unit_date
on public.pm_schedules(unit_id, scheduled_date);

create index if not exists idx_pm_schedules_assigned_user
on public.pm_schedules(assigned_user_id);

alter table public.pm_sections enable row level security;
alter table public.pm_points enable row level security;
alter table public.pm_schedules enable row level security;

drop policy if exists pm_sections_select on public.pm_sections;
create policy pm_sections_select on public.pm_sections
for select to authenticated
using (
  public.is_super_admin()
  or unit_id = public.get_my_unit_id()
  or exists (
    select 1
    from public.super_admin_unit_access
    where user_id = auth.uid()
      and unit_id = pm_sections.unit_id
  )
);

drop policy if exists pm_sections_manage on public.pm_sections;
create policy pm_sections_manage on public.pm_sections
for all to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
      and unit_id = pm_sections.unit_id
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
      and unit_id = pm_sections.unit_id
  )
);

drop policy if exists pm_points_select on public.pm_points;
create policy pm_points_select on public.pm_points
for select to authenticated
using (
  public.is_super_admin()
  or unit_id = public.get_my_unit_id()
  or exists (
    select 1
    from public.super_admin_unit_access
    where user_id = auth.uid()
      and unit_id = pm_points.unit_id
  )
);

drop policy if exists pm_points_manage on public.pm_points;
create policy pm_points_manage on public.pm_points
for all to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
      and unit_id = pm_points.unit_id
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
      and unit_id = pm_points.unit_id
  )
);

drop policy if exists pm_schedules_select on public.pm_schedules;
create policy pm_schedules_select on public.pm_schedules
for select to authenticated
using (
  public.is_super_admin()
  or unit_id = public.get_my_unit_id()
  or exists (
    select 1
    from public.super_admin_unit_access
    where user_id = auth.uid()
      and unit_id = pm_schedules.unit_id
  )
);

drop policy if exists pm_schedules_manage on public.pm_schedules;
create policy pm_schedules_manage on public.pm_schedules
for all to authenticated
using (
  public.is_super_admin()
  or exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
      and unit_id = pm_schedules.unit_id
  )
)
with check (
  public.is_super_admin()
  or exists (
    select 1
    from public.users
    where id = auth.uid()
      and role = 'admin'
      and unit_id = pm_schedules.unit_id
  )
);
