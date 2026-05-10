-- Align incident RLS policies with the current user_role enum:
-- super_admin, admin, petugas, viewer.

drop policy if exists incidents_select on public.incidents;
drop policy if exists incidents_insert on public.incidents;
drop policy if exists incidents_update on public.incidents;
drop policy if exists incidents_delete on public.incidents;

create policy incidents_select on public.incidents for select
  using (
    public.is_super_admin()
    or daily_report_id in (
      select id from public.daily_reports where unit_id = public.get_my_unit_id()
    )
  );

create policy incidents_insert on public.incidents for insert
  with check (
    public.is_super_admin()
    or (
      public.get_my_role() in ('petugas'::public.user_role, 'admin'::public.user_role)
      and daily_report_id in (
        select id from public.daily_reports where unit_id = public.get_my_unit_id()
      )
    )
  );

create policy incidents_update on public.incidents for update
  using (
    public.is_super_admin()
    or (
      public.get_my_role() in ('petugas'::public.user_role, 'admin'::public.user_role)
      and daily_report_id in (
        select id from public.daily_reports where unit_id = public.get_my_unit_id()
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.get_my_role() in ('petugas'::public.user_role, 'admin'::public.user_role)
      and daily_report_id in (
        select id from public.daily_reports where unit_id = public.get_my_unit_id()
      )
    )
  );

create policy incidents_delete on public.incidents for delete
  using (
    public.is_super_admin()
    or (
      public.get_my_role() = 'admin'::public.user_role
      and daily_report_id in (
        select id from public.daily_reports where unit_id = public.get_my_unit_id()
      )
    )
  );

drop policy if exists photos_select on public.incident_photos;
drop policy if exists photos_manage on public.incident_photos;

create policy photos_select on public.incident_photos for select
  using (
    public.is_super_admin()
    or incident_id in (
      select i.id
      from public.incidents i
      join public.daily_reports dr on dr.id = i.daily_report_id
      where dr.unit_id = public.get_my_unit_id()
    )
  );

create policy photos_manage on public.incident_photos for all
  using (
    public.is_super_admin()
    or (
      public.get_my_role() in ('petugas'::public.user_role, 'admin'::public.user_role)
      and incident_id in (
        select i.id
        from public.incidents i
        join public.daily_reports dr on dr.id = i.daily_report_id
        where dr.unit_id = public.get_my_unit_id()
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.get_my_role() in ('petugas'::public.user_role, 'admin'::public.user_role)
      and incident_id in (
        select i.id
        from public.incidents i
        join public.daily_reports dr on dr.id = i.daily_report_id
        where dr.unit_id = public.get_my_unit_id()
      )
    )
  );
