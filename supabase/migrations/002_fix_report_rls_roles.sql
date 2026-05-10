-- Align report RLS policies with the current user_role enum:
-- super_admin, admin, petugas, viewer.

drop policy if exists dreports_select on public.daily_reports;
drop policy if exists dreports_insert on public.daily_reports;
drop policy if exists dreports_update on public.daily_reports;
drop policy if exists dreports_delete on public.daily_reports;

create policy dreports_select on public.daily_reports for select
  using (
    public.is_super_admin()
    or unit_id = public.get_my_unit_id()
  );

create policy dreports_insert on public.daily_reports for insert
  with check (
    public.is_super_admin()
    or (
      unit_id = public.get_my_unit_id()
      and public.get_my_role() in ('petugas'::public.user_role, 'admin'::public.user_role)
    )
  );

create policy dreports_update on public.daily_reports for update
  using (
    public.is_super_admin()
    or (
      unit_id = public.get_my_unit_id()
      and public.get_my_role() in ('petugas'::public.user_role, 'admin'::public.user_role)
    )
  )
  with check (
    public.is_super_admin()
    or (
      unit_id = public.get_my_unit_id()
      and public.get_my_role() in ('petugas'::public.user_role, 'admin'::public.user_role)
    )
  );

create policy dreports_delete on public.daily_reports for delete
  using (
    public.is_super_admin()
    or (
      unit_id = public.get_my_unit_id()
      and public.get_my_role() = 'admin'::public.user_role
    )
  );

drop policy if exists fsl_select on public.facility_status_logs;
drop policy if exists fsl_insert on public.facility_status_logs;
drop policy if exists fsl_update on public.facility_status_logs;
drop policy if exists fsl_delete on public.facility_status_logs;

create policy fsl_select on public.facility_status_logs for select
  using (
    public.is_super_admin()
    or daily_report_id in (
      select id from public.daily_reports where unit_id = public.get_my_unit_id()
    )
  );

create policy fsl_insert on public.facility_status_logs for insert
  with check (
    public.is_super_admin()
    or (
      public.get_my_role() in ('petugas'::public.user_role, 'admin'::public.user_role)
      and daily_report_id in (
        select id from public.daily_reports where unit_id = public.get_my_unit_id()
      )
    )
  );

create policy fsl_update on public.facility_status_logs for update
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

create policy fsl_delete on public.facility_status_logs for delete
  using (
    public.is_super_admin()
    or (
      public.get_my_role() = 'admin'::public.user_role
      and daily_report_id in (
        select id from public.daily_reports where unit_id = public.get_my_unit_id()
      )
    )
  );
