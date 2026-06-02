-- Cleanup early ELBAN PM seed mistakes:
-- 1. FD / UPS is part of Network & Kawasan, not a fourth section.
-- 2. Seeded schedules should have a shift value.
--
-- This is safe after running the corrected seed: duplicate FD points under
-- Network & Kawasan are preserved, old FD-section points are removed.

with elban as (
  select id from public.units where code = 'ELBAN' limit 1
),
target_sections as (
  select
    elban.id as unit_id,
    network.id as network_section_id,
    fd.id as fd_section_id
  from elban
  left join public.pm_sections network
    on network.unit_id = elban.id
   and network.name = 'Network & Kawasan'
  left join public.pm_sections fd
    on fd.unit_id = elban.id
   and fd.name = 'Data Lokasi FD / UPS'
),
point_pairs as (
  select
    old_points.id as old_point_id,
    new_points.id as new_point_id
  from target_sections
  join public.pm_points old_points
    on old_points.unit_id = target_sections.unit_id
   and old_points.section_id = target_sections.fd_section_id
  join public.pm_points new_points
    on new_points.unit_id = target_sections.unit_id
   and new_points.section_id = target_sections.network_section_id
   and new_points.code = old_points.code
  where target_sections.network_section_id is not null
    and target_sections.fd_section_id is not null
),
rewired_schedules as (
  update public.pm_schedules schedules
  set
    section_id = target_sections.network_section_id,
    point_id = point_pairs.new_point_id
  from point_pairs
  join target_sections on true
  where schedules.point_id = point_pairs.old_point_id
  returning schedules.id
),
deleted_old_points as (
  delete from public.pm_points old_points
  using target_sections
  where old_points.unit_id = target_sections.unit_id
    and old_points.section_id = target_sections.fd_section_id
  returning old_points.id
)
update public.pm_sections sections
set is_active = false
from target_sections
where sections.id = target_sections.fd_section_id;

update public.pm_schedules
set shift = 'pagi'
where shift is null;

with elban as (
  select id from public.units where code = 'ELBAN' limit 1
),
network as (
  select sections.id, sections.unit_id
  from public.pm_sections sections
  join elban on elban.id = sections.unit_id
  where sections.name = 'Network & Kawasan'
),
fd_data as (
  select *
  from (
    values
      ('1', 'FD 1.1.1', 'Kantor BIJB Lantai 1 - 3 kVA - 1 UPS ON'),
      ('2', 'FD 1.1.2', 'Sebelah ruang sipil - 3 kVA - 1 UPS OFF'),
      ('3', 'FD 1.1.3', 'Baggage claim domestik masuk dari luar - 3 kVA - 1 UPS OFF'),
      ('4', 'FD IMIGRASI1-1', 'Transit Inter - 3 kVA - 1 UPS OFF, 1 UPS ON'),
      ('5', 'FD 1.4.2', 'Lift tengah Area Baggage Claim Domestic - 3 kVA - 1 UPS ON'),
      ('6', 'FD 1.2.2', 'Baggage Claim internasional sebelah conveyor 1 - 3 kVA - 1 UPS OFF'),
      ('7', 'FD 1.4.1', 'Samping Area UMKM - 3 kVA - 1 UPS ON'),
      ('8', 'FD 1.2.1', 'Rencana Ruang VIP lantai 1 area internasional - 3 kVA - 1 UPS ON'),
      ('9', 'FD 1.4.3', 'Samping Lift Curbside Lantai 1 Zone Domestik - 3 kVA - 1 UPS OFF'),
      ('10', 'FD 1.3.2', 'Samping Lift Curbside Lantai 1 Zone Internasional - 3 kVA - 1 UPS OFF'),
      ('11', 'FD 1.3.1', 'Depan toilet kedatangan internasional - 3 kVA - 1 UPS ON'),
      ('12', 'FD 2.1.1', 'Depan Garbarata 3 - 3 kVA - 1 UPS ON'),
      ('13', 'FD 2.2.1', 'Depan Garbarata 2 - 3 kVA - 1 UPS OFF'),
      ('14', 'FD 2.1.2', 'Depan Brownis Amanda - 3 kVA - 1 UPS ON'),
      ('15', 'FD 2.2.2', 'Samping Lorong Musholla BL Intr - 3 kVA - 2 UPS OFF'),
      ('16', 'FD 2.4.1', 'Lift Tengah - 3 kVA - 2 UPS OFF'),
      ('17', 'FD 2.3.1', 'Perkantoran Airline Lantai 2 - 3 kVA - 1 UPS OFF'),
      ('18', 'FD 2.4.2', 'Perkantoran PT. BIJB LT 2 - 3 kVA - 1 UPS ON'),
      ('19', 'FD SERVER', 'Ruang Server - 3 kVA - 1 UPS ON'),
      ('20', 'FD IMIGRASI2', 'Kantor Imigrasi LT 2 - 3 kVA')
  ) as data(code, name, location_detail)
),
updated_network_points as (
  update public.pm_points points
  set
    name = fd_data.name,
    location_detail = fd_data.location_detail
  from network
  join fd_data on true
  where points.unit_id = network.unit_id
    and points.section_id = network.id
    and points.code = fd_data.code
  returning points.id
)
delete from public.pm_points points
using network
where points.unit_id = network.unit_id
  and points.section_id = network.id
  and points.code like 'FD %';
