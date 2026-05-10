-- Scope facility categories to units.
-- Existing categories are assigned to Unit ELIT, then unit_id becomes required.

alter table public.facility_categories
add column if not exists unit_id uuid references public.units(id) on delete cascade;

update public.facility_categories
set unit_id = (select id from public.units where code = 'ELIT')
where unit_id is null;

alter table public.facility_categories
alter column unit_id set not null;

create index if not exists idx_facility_categories_unit
on public.facility_categories(unit_id);

drop policy if exists fcat_select on public.facility_categories;
drop policy if exists fcat_manage on public.facility_categories;

create policy fcat_select on public.facility_categories for select
  using (
    public.is_super_admin()
    or unit_id = public.get_my_unit_id()
  );

create policy fcat_manage on public.facility_categories for all
  using (
    public.is_super_admin()
    or (
      public.get_my_role() = 'admin'::public.user_role
      and unit_id = public.get_my_unit_id()
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.get_my_role() = 'admin'::public.user_role
      and unit_id = public.get_my_unit_id()
    )
  );
