-- Initial ELBAN PM schedule matrix for May 2026.
-- Adjust staff names in staff_map if the APBA/APLA mapping differs.

with elban as (
  select id
  from public.units
  where code = 'ELBAN'
  limit 1
),
staff_map as (
  select *
  from (
    values
      ('SCP', 1, 'Ade Miftahudin'),
      ('SCP', 2, 'Alif Alpian SM'),
      ('Kamera CCTV & Fasilitas', 1, 'Dwi Eka Hardianta'),
      ('Kamera CCTV & Fasilitas', 2, 'Faris Persib'),
      ('Network & Kawasan', 1, 'Moh Arif Setiawan'),
      ('Network & Kawasan', 2, 'Muhamad Japar Sodik')
  ) as data(section_name, staff_order, full_name)
),
schedule_source as (
  select *
  from (
    values
      (
        'SCP',
        1,
        array[
          'B','A','C','E','G','I','K','A','C','E','G','I','K','A','C','E',
          'G','I','K','A','C','E','G','I','K','A','C','E','G','I','E'
        ]::text[]
      ),
      (
        'SCP',
        2,
        array[
          'L','B','D','F','H','J','L','B','D','F','H','J','L','B','D','F',
          'H','J','L','B','D','F','H','J','L','B','D','F','H','J','F'
        ]::text[]
      ),
      (
        'Kamera CCTV & Fasilitas',
        1,
        array[
          '25','22','17','23','24','16','28','25','27','30','8','6','25','22','17','23',
          '24','16','28','13','2','21','8','6','25','13','1','14','3','7','11'
        ]::text[]
      ),
      (
        'Kamera CCTV & Fasilitas',
        2,
        array[
          '18','4','19','9','10','11','20','29','5','12','3','7','18','4','19','9',
          '10','11','20','15','1','14','3','7','18','15','1','14','8','6','17'
        ]::text[]
      ),
      (
        'Network & Kawasan',
        1,
        array[
          '25','22','17','23','24','16','28','25','27','30','8','6','25','22','17','23',
          '24','16','28','13','2','21','8','6','25','13','1','14','3','7','19'
        ]::text[]
      ),
      (
        'Network & Kawasan',
        2,
        array[
          '18','4','19','9','10','11','20','29','5','12','3','7','18','4','19','9',
          '10','11','20','15','1','14','3','7','18','15','1','14','8','6','17'
        ]::text[]
      )
  ) as data(section_name, staff_order, codes)
),
expanded as (
  select
    schedule_source.section_name,
    schedule_source.staff_order,
    code_data.day_no::int,
    code_data.code
  from schedule_source
  cross join lateral unnest(schedule_source.codes) with ordinality as code_data(code, day_no)
),
resolved as (
  select
    elban.id as unit_id,
    sections.id as section_id,
    points.id as point_id,
    users.id as assigned_user_id,
    (date '2026-05-01' + (expanded.day_no - 1))::date as scheduled_date,
    expanded.code,
    staff_map.full_name
  from expanded
  join elban on true
  join staff_map
    on staff_map.section_name = expanded.section_name
   and staff_map.staff_order = expanded.staff_order
  join public.pm_sections sections
    on sections.unit_id = elban.id
   and sections.name = expanded.section_name
  join public.pm_points points
    on points.unit_id = elban.id
   and points.section_id = sections.id
   and points.code = expanded.code
  left join public.users users
    on users.unit_id = elban.id
   and lower(users.full_name) = lower(staff_map.full_name)
)
insert into public.pm_schedules (
  unit_id,
  section_id,
  point_id,
  assigned_user_id,
  scheduled_date,
  shift,
  status,
  notes,
  created_by
)
select
  resolved.unit_id,
  resolved.section_id,
  resolved.point_id,
  resolved.assigned_user_id,
  resolved.scheduled_date,
  null,
  'planned',
  'Seed jadwal PM Mei 2026 dari jadwal manual.',
  null
from resolved
where not exists (
  select 1
  from public.pm_schedules existing
  where existing.unit_id = resolved.unit_id
    and existing.section_id = resolved.section_id
    and existing.point_id = resolved.point_id
    and existing.scheduled_date = resolved.scheduled_date
    and coalesce(existing.assigned_user_id::text, '') = coalesce(resolved.assigned_user_id::text, '')
);
