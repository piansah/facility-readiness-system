-- Initial PM master data for ELBAN.
-- Run after 016_dynamic_pm_schedules.sql.

with elban as (
  select id from public.units where code = 'ELBAN' limit 1
),
insert_sections as (
  insert into public.pm_sections (unit_id, name, color, sort_order)
  select elban.id, data.name, data.color, data.sort_order
  from elban
  cross join (
    values
      ('SCP', 'emerald', 10),
      ('Kamera CCTV & Fasilitas', 'amber', 20),
      ('Network & Kawasan', 'rose', 30)
  ) as data(name, color, sort_order)
  on conflict (unit_id, name)
  do update set
    color = excluded.color,
    sort_order = excluded.sort_order,
    is_active = true
  returning id, unit_id, name
),
sections as (
  select id, unit_id, name from insert_sections
  union
  select s.id, s.unit_id, s.name
  from public.pm_sections s
  join elban on elban.id = s.unit_id
  where s.name in ('SCP', 'Kamera CCTV & Fasilitas', 'Network & Kawasan')
)
insert into public.pm_points (
  unit_id,
  section_id,
  code,
  name,
  location_detail,
  frequency,
  sort_order
)
select
  sections.unit_id,
  sections.id,
  data.code,
  data.name,
  data.location_detail,
  data.frequency,
  data.sort_order
from sections
join (
  values
    -- SCP
    ('SCP', 'A', 'SCP Inter Line 1', null, 'weekly', 10),
    ('SCP', 'B', 'SCP Inter Line 2', null, 'weekly', 20),
    ('SCP', 'C', 'SCP Inter', null, 'weekly', 30),
    ('SCP', 'D', 'Pos Domestik', null, 'weekly', 40),
    ('SCP', 'E', 'SCP Dom Line 1', null, 'weekly', 50),
    ('SCP', 'F', 'SCP Dom Line 2', null, 'weekly', 60),
    ('SCP', 'G', 'LD Inter', null, 'weekly', 70),
    ('SCP', 'H', 'Curbside / Drop Down Area', null, 'weekly', 80),
    ('SCP', 'I', 'Curbside Declare', null, 'weekly', 90),
    ('SCP', 'J', 'LD Dom', null, 'weekly', 100),
    ('SCP', 'K', 'Pos Kargo', null, 'weekly', 110),
    ('SCP', 'L', 'OOG', null, 'weekly', 120),

    -- Kamera CCTV & Fasilitas
    ('Kamera CCTV & Fasilitas', '1', 'LT 1 Arrival Dom & Make Up', null, 'monthly', 10),
    ('Kamera CCTV & Fasilitas', '2', 'LT 1 Arrival Inter & Make Up', null, 'monthly', 20),
    ('Kamera CCTV & Fasilitas', '3', 'LT 1 Arrival Hall Dom', null, 'monthly', 30),
    ('Kamera CCTV & Fasilitas', '4', 'LT 1 Arrival Hall Inter', null, 'monthly', 40),
    ('Kamera CCTV & Fasilitas', '5', 'LT 1 BHS Claim Dom', null, 'monthly', 50),
    ('Kamera CCTV & Fasilitas', '6', 'LT 1 BHS Claim Int', null, 'monthly', 60),
    ('Kamera CCTV & Fasilitas', '7', 'Loading Dock Dom', null, 'monthly', 70),
    ('Kamera CCTV & Fasilitas', '8', 'Loading Dock Inter', null, 'monthly', 80),
    ('Kamera CCTV & Fasilitas', '9', 'LT 1 Pick Up Zone Domestik', null, 'monthly', 90),
    ('Kamera CCTV & Fasilitas', '10', 'LT 1 Pick Up Zone Inter', null, 'monthly', 100),
    ('Kamera CCTV & Fasilitas', '11', 'LT 1 Tenant', null, 'monthly', 110),
    ('Kamera CCTV & Fasilitas', '12', 'LT 2 R. Dom & Darjanata', null, 'monthly', 120),
    ('Kamera CCTV & Fasilitas', '13', 'LT 2 BL Inter & Darjanata', null, 'monthly', 130),
    ('Kamera CCTV & Fasilitas', '14', 'LT 2 Koridor Dom & SCP 2 Dom', null, 'monthly', 140),
    ('Kamera CCTV & Fasilitas', '15', 'LT 2 Koridor Inter & SCP 2 Inter', null, 'monthly', 150),
    ('Kamera CCTV & Fasilitas', '16', 'Perkantoran HUB & Airlink', null, 'monthly', 160),
    ('Kamera CCTV & Fasilitas', '17', 'LT 3 Check-in Area Inter', null, 'monthly', 170),
    ('Kamera CCTV & Fasilitas', '18', 'LT 3 Check-in Area Dom', null, 'monthly', 180),
    ('Kamera CCTV & Fasilitas', '19', 'LT 3 Bekas SCP 2', null, 'monthly', 190),
    ('Kamera CCTV & Fasilitas', '20', 'LT 3 Dropzone', null, 'monthly', 200),
    ('Kamera CCTV & Fasilitas', '21', 'Remote Parking Stand', null, 'monthly', 210),
    ('Kamera CCTV & Fasilitas', '22', 'TILAW MPH', null, 'monthly', 220),
    ('Kamera CCTV & Fasilitas', '23', 'Parameter RW 12', null, 'monthly', 230),
    ('Kamera CCTV & Fasilitas', '24', 'Parameter RW 32', null, 'monthly', 240),
    ('Kamera CCTV & Fasilitas', '25', 'Luar Kargo', null, 'monthly', 250),
    ('Kamera CCTV & Fasilitas', '26', 'Parkiran', null, 'monthly', 260),
    ('Kamera CCTV & Fasilitas', '27', 'Meteo & Tower', null, 'monthly', 270),
    ('Kamera CCTV & Fasilitas', '28', 'Kargo', null, 'monthly', 280),
    ('Kamera CCTV & Fasilitas', '29', 'Dalam MPH', null, 'monthly', 290),
    ('Kamera CCTV & Fasilitas', '30', 'Dalam PKP-PK', null, 'monthly', 300),

    -- Network & Kawasan
    ('Network & Kawasan', '1', 'FD 1.1.1', 'Kantor BIJB Lantai 1 - 3 kVA - 1 UPS ON', 'monthly', 10),
    ('Network & Kawasan', '2', 'FD 1.1.2', 'Sebelah ruang sipil - 3 kVA - 1 UPS OFF', 'monthly', 20),
    ('Network & Kawasan', '3', 'FD 1.1.3', 'Baggage claim domestik masuk dari luar - 3 kVA - 1 UPS OFF', 'monthly', 30),
    ('Network & Kawasan', '4', 'FD IMIGRASI1-1', 'Transit Inter - 3 kVA - 1 UPS OFF, 1 UPS ON', 'monthly', 40),
    ('Network & Kawasan', '5', 'FD 1.4.2', 'Lift tengah Area Baggage Claim Domestic - 3 kVA - 1 UPS ON', 'monthly', 50),
    ('Network & Kawasan', '6', 'FD 1.2.2', 'Baggage Claim internasional sebelah conveyor 1 - 3 kVA - 1 UPS OFF', 'monthly', 60),
    ('Network & Kawasan', '7', 'FD 1.4.1', 'Samping Area UMKM - 3 kVA - 1 UPS ON', 'monthly', 70),
    ('Network & Kawasan', '8', 'FD 1.2.1', 'Rencana Ruang VIP lantai 1 area internasional - 3 kVA - 1 UPS ON', 'monthly', 80),
    ('Network & Kawasan', '9', 'FD 1.4.3', 'Samping Lift Curbside Lantai 1 Zone Domestik - 3 kVA - 1 UPS OFF', 'monthly', 90),
    ('Network & Kawasan', '10', 'FD 1.3.2', 'Samping Lift Curbside Lantai 1 Zone Internasional - 3 kVA - 1 UPS OFF', 'monthly', 100),
    ('Network & Kawasan', '11', 'FD 1.3.1', 'Depan toilet kedatangan internasional - 3 kVA - 1 UPS ON', 'monthly', 110),
    ('Network & Kawasan', '12', 'FD 2.1.1', 'Depan Garbarata 3 - 3 kVA - 1 UPS ON', 'monthly', 120),
    ('Network & Kawasan', '13', 'FD 2.2.1', 'Depan Garbarata 2 - 3 kVA - 1 UPS OFF', 'monthly', 130),
    ('Network & Kawasan', '14', 'FD 2.1.2', 'Depan Brownis Amanda - 3 kVA - 1 UPS ON', 'monthly', 140),
    ('Network & Kawasan', '15', 'FD 2.2.2', 'Samping Lorong Musholla BL Intr - 3 kVA - 2 UPS OFF', 'monthly', 150),
    ('Network & Kawasan', '16', 'FD 2.4.1', 'Lift Tengah - 3 kVA - 2 UPS OFF', 'monthly', 160),
    ('Network & Kawasan', '17', 'FD 2.3.1', 'Perkantoran Airline Lantai 2 - 3 kVA - 1 UPS OFF', 'monthly', 170),
    ('Network & Kawasan', '18', 'FD 2.4.2', 'Perkantoran PT. BIJB LT 2 - 3 kVA - 1 UPS ON', 'monthly', 180),
    ('Network & Kawasan', '19', 'FD SERVER', 'Ruang Server - 3 kVA - 1 UPS ON', 'monthly', 190),
    ('Network & Kawasan', '20', 'FD IMIGRASI2', 'Kantor Imigrasi LT 2 - 3 kVA', 'monthly', 200),
    ('Network & Kawasan', '21', 'SS1', null, 'monthly', 210),
    ('Network & Kawasan', '22', 'SS2', null, 'monthly', 220),
    ('Network & Kawasan', '23', 'SS3', null, 'monthly', 230),
    ('Network & Kawasan', '24', 'SS4', null, 'monthly', 240),
    ('Network & Kawasan', '25', 'SS5', null, 'monthly', 250),
    ('Network & Kawasan', '26', 'SS6', null, 'monthly', 260),
    ('Network & Kawasan', '27', 'SS9 & Meteo', null, 'monthly', 270),
    ('Network & Kawasan', '28', 'Kargo', null, 'monthly', 280),
    ('Network & Kawasan', '29', 'MPH', null, 'monthly', 290),
    ('Network & Kawasan', '30', 'PKP-PK', null, 'monthly', 300)
) as data(section_name, code, name, location_detail, frequency, sort_order)
  on data.section_name = sections.name
on conflict (unit_id, section_id, code)
do update set
  section_id = excluded.section_id,
  name = excluded.name,
  location_detail = excluded.location_detail,
  frequency = excluded.frequency,
  sort_order = excluded.sort_order,
  is_active = true;
