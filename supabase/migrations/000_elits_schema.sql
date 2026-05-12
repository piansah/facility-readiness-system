-- ============================================================
-- ELITS FACILITY READINESS REPORTING SYSTEM
-- PostgreSQL Schema v3
-- Multi-Unit dalam 1 Bandara (BIJB)
-- RLS Enabled | Role-Based Access
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- ENUMS
-- ============================================================
CREATE TYPE user_role AS ENUM (
  'super_admin',  -- Manajemen bandara, bisa lihat semua unit
  'admin',        -- Admin per unit, kelola user & review laporan
  'petugas',      -- Input laporan harian & non-rutin
  'viewer'        -- Baca laporan saja
);

CREATE TYPE shift_type AS ENUM (
  'pagi',
  'malam'
);

CREATE TYPE report_status AS ENUM (
  'draft',
  'submitted',
  'reviewed'
);

CREATE TYPE facility_status AS ENUM (
  'normal',           -- ✅
  'rusak',            -- ❌
  'operasi_menurun'   -- ⚠️
);

CREATE TYPE incident_status AS ENUM (
  'open',
  'in_progress',
  'resolved'
);


-- ============================================================
-- 1. UNITS (unit-unit di dalam Bandara BIJB)
-- ============================================================
CREATE TABLE units (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(20)  NOT NULL UNIQUE,  -- e.g. 'ELIT', 'AVSEC', 'TEKNIK'
  name        VARCHAR(100) NOT NULL,          -- e.g. 'Unit ELIT', 'Unit Avsec'
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE units IS 'Unit-unit yang beroperasi di Bandara BIJB';


-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id     UUID REFERENCES units(id) ON DELETE SET NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  full_name   VARCHAR(100) NOT NULL,
  role        user_role NOT NULL DEFAULT 'petugas',
  phone       VARCHAR(20),
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE users IS 'Pengguna sistem. super_admin boleh unit_id NULL (lintas unit)';
COMMENT ON COLUMN users.unit_id IS 'NULL hanya untuk super_admin';


-- ============================================================
-- 3. FACILITY CATEGORIES
-- ============================================================
CREATE TABLE facility_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        VARCHAR(50) NOT NULL,
  code        VARCHAR(20) NOT NULL UNIQUE,
  icon        VARCHAR(10),
  sort_order  INT NOT NULL DEFAULT 0
);

COMMENT ON TABLE facility_categories IS 'Kategori fasilitas: X-ray, WTMD, CCTV, dst';

INSERT INTO facility_categories (name, code, icon, sort_order) VALUES
  ('X-ray',             'XRAY',  '📡', 1),
  ('WTMD',              'WTMD',  '🚶', 2),
  ('Body Scanner',      'BSCAN', '🔵', 3),
  ('HHMD',              'HHMD',  '📲', 4),
  ('ETD',               'ETD',   '🧪', 5),
  ('PAS',               'PAS',   '🎫', 6),
  ('Jaringan Ethernet', 'NETW',  '🌐', 7),
  ('CCTV',              'CCTV',  '📷', 8),
  ('Access Control',    'ACCS',  '🔐', 9),
  ('FAS',               'FAS',   '🔥', 10),
  ('PABX',              'PABX',  '📞', 11),
  ('FIDS',              'FIDS',  '🖥️', 12),
  ('BAS',               'BAS',   '🏗️', 13);


-- ============================================================
-- 4. FACILITIES
-- ============================================================
CREATE TABLE facilities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id         UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES facility_categories(id),
  name            VARCHAR(100) NOT NULL,
  location_detail VARCHAR(100),
  asset_code      VARCHAR(50),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE facilities IS 'Aset/fasilitas per unit. Tiap unit punya daftarnya sendiri';

CREATE INDEX idx_facilities_unit_id     ON facilities(unit_id);
CREATE INDEX idx_facilities_category_id ON facilities(category_id);


-- ============================================================
-- 5. DAILY REPORTS
-- ============================================================
CREATE TABLE daily_reports (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id       UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  created_by    UUID NOT NULL REFERENCES users(id),
  report_date   DATE NOT NULL,
  shift         shift_type NOT NULL,
  status        report_status NOT NULL DEFAULT 'draft',
  submitted_at  TIMESTAMPTZ,
  reviewed_by   UUID REFERENCES users(id),
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 1 laporan per unit per tanggal per shift
  UNIQUE (unit_id, report_date, shift)
);

COMMENT ON TABLE daily_reports IS 'Header laporan harian per unit per shift';

CREATE INDEX idx_daily_reports_unit_date ON daily_reports(unit_id, report_date);


-- ============================================================
-- 6. DUTY ROSTER
-- ============================================================
CREATE TABLE duty_roster (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id  UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES users(id),
  shift            shift_type NOT NULL,
  role_on_duty     VARCHAR(50),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (daily_report_id, user_id)
);

COMMENT ON TABLE duty_roster IS 'Petugas yang bertugas per laporan harian';

CREATE INDEX idx_duty_roster_report ON duty_roster(daily_report_id);


-- ============================================================
-- 7. FACILITY STATUS LOGS
-- ============================================================
CREATE TABLE facility_status_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id  UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  facility_id      UUID NOT NULL REFERENCES facilities(id),
  checked_by       UUID NOT NULL REFERENCES users(id),
  status           facility_status NOT NULL DEFAULT 'normal',
  notes            TEXT,
  checked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (daily_report_id, facility_id)
);

COMMENT ON TABLE facility_status_logs IS 'Status ✅❌⚠️ per fasilitas per laporan harian';

CREATE INDEX idx_fsl_report_id ON facility_status_logs(daily_report_id);
CREATE INDEX idx_fsl_facility  ON facility_status_logs(facility_id);
CREATE INDEX idx_fsl_status    ON facility_status_logs(status);


-- ============================================================
-- 8. INCIDENTS (Non-Rutin)
-- ============================================================
CREATE TABLE incidents (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id  UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  facility_id      UUID REFERENCES facilities(id) ON DELETE SET NULL,
  reported_by      UUID NOT NULL REFERENCES users(id),
  incident_time    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title            VARCHAR(200) NOT NULL,
  description      TEXT NOT NULL,
  action_taken     TEXT,
  status           incident_status NOT NULL DEFAULT 'open',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE incidents IS 'Laporan non-rutin. Menggantikan kiriman foto manual via WhatsApp';

CREATE INDEX idx_incidents_report   ON incidents(daily_report_id);
CREATE INDEX idx_incidents_facility ON incidents(facility_id);
CREATE INDEX idx_incidents_status   ON incidents(status);
CREATE INDEX idx_incidents_time     ON incidents(incident_time);


-- ============================================================
-- 9. INCIDENT PHOTOS
-- ============================================================
CREATE TABLE incident_photos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id  UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption      TEXT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE incident_photos IS 'Foto dokumentasi insiden — disimpan di Supabase Storage';

CREATE INDEX idx_incident_photos_incident ON incident_photos(incident_id);


-- ============================================================
-- 10. FOLLOW-UPS
-- ============================================================
CREATE TABLE followups (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id    UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  created_by     UUID NOT NULL REFERENCES users(id),
  description    TEXT NOT NULL,
  surat_dinas_no VARCHAR(150),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE followups IS 'Tindak lanjut dan nomor surat dinas per insiden';

CREATE INDEX idx_followups_incident ON followups(incident_id);


-- ============================================================
-- 11. SUMMARY NOTES
-- ============================================================
CREATE TABLE summary_notes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id  UUID NOT NULL REFERENCES daily_reports(id) ON DELETE CASCADE,
  facility_id      UUID REFERENCES facilities(id) ON DELETE SET NULL,
  item_number      INT NOT NULL,
  description      TEXT NOT NULL,
  tindak_lanjut    TEXT,
  is_recurring     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE summary_notes IS 'Ket/Summary laporan harian — bisa di-generate otomatis';

CREATE INDEX idx_summary_notes_report ON summary_notes(daily_report_id);


-- ============================================================
-- 12. AUDIT LOGS
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  unit_id     UUID REFERENCES units(id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,
  table_name  VARCHAR(50) NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE audit_logs IS 'Jejak perubahan data untuk akuntabilitas';

CREATE INDEX idx_audit_logs_user       ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_unit       ON audit_logs(unit_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);


-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_unit_id()
RETURNS UUID LANGUAGE SQL STABLE AS $$
  SELECT unit_id FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE SQL STABLE AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT get_my_role() = 'super_admin';
$$;

CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT get_my_role() IN ('super_admin', 'admin');
$$;

CREATE OR REPLACE FUNCTION is_petugas_or_above()
RETURNS BOOLEAN LANGUAGE SQL STABLE AS $$
  SELECT get_my_role() IN ('super_admin', 'admin', 'petugas');
$$;


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE units                ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_categories  ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities           ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE duty_roster          ENABLE ROW LEVEL SECURITY;
ALTER TABLE facility_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents            ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_photos      ENABLE ROW LEVEL SECURITY;
ALTER TABLE followups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE summary_notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- RLS: UNITS
-- super_admin : lihat semua
-- lainnya     : hanya lihat unit sendiri
-- ------------------------------------------------------------
CREATE POLICY units_select ON units FOR SELECT
  USING (
    is_super_admin()
    OR id = get_my_unit_id()
  );

CREATE POLICY units_manage ON units FOR ALL
  USING (is_super_admin());


-- ------------------------------------------------------------
-- RLS: USERS
-- super_admin : lihat & kelola semua
-- admin       : lihat & kelola user di unitnya
-- petugas     : lihat sesama unit, edit profil sendiri
-- viewer      : lihat sesama unit
-- ------------------------------------------------------------
CREATE POLICY users_select ON users FOR SELECT
  USING (
    is_super_admin()
    OR unit_id = get_my_unit_id()
    OR id = auth.uid()
  );

CREATE POLICY users_insert ON users FOR INSERT
  WITH CHECK (
    is_super_admin()
    OR (get_my_role() = 'admin' AND unit_id = get_my_unit_id())
  );

CREATE POLICY users_update ON users FOR UPDATE
  USING (
    is_super_admin()
    OR (get_my_role() = 'admin' AND unit_id = get_my_unit_id())
    OR id = auth.uid()
  );

CREATE POLICY users_delete ON users FOR DELETE
  USING (
    is_super_admin()
    OR (get_my_role() = 'admin' AND unit_id = get_my_unit_id())
  );


-- ------------------------------------------------------------
-- RLS: FACILITY CATEGORIES (global, semua bisa lihat)
-- ------------------------------------------------------------
CREATE POLICY fcat_select ON facility_categories FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY fcat_manage ON facility_categories FOR ALL
  USING (is_super_admin());


-- ------------------------------------------------------------
-- RLS: FACILITIES
-- user hanya lihat fasilitas unitnya sendiri
-- ------------------------------------------------------------
CREATE POLICY facilities_select ON facilities FOR SELECT
  USING (
    is_super_admin()
    OR unit_id = get_my_unit_id()
  );

CREATE POLICY facilities_manage ON facilities FOR ALL
  USING (
    is_super_admin()
    OR (get_my_role() = 'admin' AND unit_id = get_my_unit_id())
  );


-- ------------------------------------------------------------
-- RLS: DAILY REPORTS
-- ------------------------------------------------------------
CREATE POLICY dreports_select ON daily_reports FOR SELECT
  USING (
    is_super_admin()
    OR unit_id = get_my_unit_id()
  );

CREATE POLICY dreports_insert ON daily_reports FOR INSERT
  WITH CHECK (
    unit_id = get_my_unit_id()
    AND is_petugas_or_above()
  );

CREATE POLICY dreports_update ON daily_reports FOR UPDATE
  USING (
    is_super_admin()
    OR (unit_id = get_my_unit_id() AND is_petugas_or_above())
  );

CREATE POLICY dreports_delete ON daily_reports FOR DELETE
  USING (
    is_super_admin()
    OR (unit_id = get_my_unit_id() AND get_my_role() = 'admin')
  );


-- ------------------------------------------------------------
-- RLS: DUTY ROSTER
-- ------------------------------------------------------------
CREATE POLICY duty_select ON duty_roster FOR SELECT
  USING (
    is_super_admin()
    OR daily_report_id IN (
      SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
    )
  );

CREATE POLICY duty_manage ON duty_roster FOR ALL
  USING (
    is_super_admin()
    OR (
      is_petugas_or_above()
      AND daily_report_id IN (
        SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
      )
    )
  );


-- ------------------------------------------------------------
-- RLS: FACILITY STATUS LOGS
-- ------------------------------------------------------------
CREATE POLICY fsl_select ON facility_status_logs FOR SELECT
  USING (
    is_super_admin()
    OR daily_report_id IN (
      SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
    )
  );

CREATE POLICY fsl_insert ON facility_status_logs FOR INSERT
  WITH CHECK (
    is_petugas_or_above()
    AND daily_report_id IN (
      SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
    )
  );

CREATE POLICY fsl_update ON facility_status_logs FOR UPDATE
  USING (
    is_super_admin()
    OR (
      is_petugas_or_above()
      AND daily_report_id IN (
        SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
      )
    )
  );

CREATE POLICY fsl_delete ON facility_status_logs FOR DELETE
  USING (
    is_super_admin()
    OR (
      get_my_role() = 'admin'
      AND daily_report_id IN (
        SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
      )
    )
  );


-- ------------------------------------------------------------
-- RLS: INCIDENTS
-- ------------------------------------------------------------
CREATE POLICY incidents_select ON incidents FOR SELECT
  USING (
    is_super_admin()
    OR daily_report_id IN (
      SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
    )
  );

CREATE POLICY incidents_insert ON incidents FOR INSERT
  WITH CHECK (
    is_petugas_or_above()
    AND daily_report_id IN (
      SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
    )
  );

CREATE POLICY incidents_update ON incidents FOR UPDATE
  USING (
    is_super_admin()
    OR (
      is_petugas_or_above()
      AND daily_report_id IN (
        SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
      )
    )
  );

CREATE POLICY incidents_delete ON incidents FOR DELETE
  USING (
    is_super_admin()
    OR (
      get_my_role() = 'admin'
      AND daily_report_id IN (
        SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
      )
    )
  );


-- ------------------------------------------------------------
-- RLS: INCIDENT PHOTOS
-- ------------------------------------------------------------
CREATE POLICY photos_select ON incident_photos FOR SELECT
  USING (
    is_super_admin()
    OR incident_id IN (
      SELECT i.id FROM incidents i
      JOIN daily_reports dr ON dr.id = i.daily_report_id
      WHERE dr.unit_id = get_my_unit_id()
    )
  );

CREATE POLICY photos_manage ON incident_photos FOR ALL
  USING (
    is_super_admin()
    OR (
      is_petugas_or_above()
      AND incident_id IN (
        SELECT i.id FROM incidents i
        JOIN daily_reports dr ON dr.id = i.daily_report_id
        WHERE dr.unit_id = get_my_unit_id()
      )
    )
  );


-- ------------------------------------------------------------
-- RLS: FOLLOW-UPS
-- ------------------------------------------------------------
CREATE POLICY followups_select ON followups FOR SELECT
  USING (
    is_super_admin()
    OR incident_id IN (
      SELECT i.id FROM incidents i
      JOIN daily_reports dr ON dr.id = i.daily_report_id
      WHERE dr.unit_id = get_my_unit_id()
    )
  );

CREATE POLICY followups_manage ON followups FOR ALL
  USING (
    is_super_admin()
    OR (
      is_petugas_or_above()
      AND incident_id IN (
        SELECT i.id FROM incidents i
        JOIN daily_reports dr ON dr.id = i.daily_report_id
        WHERE dr.unit_id = get_my_unit_id()
      )
    )
  );


-- ------------------------------------------------------------
-- RLS: SUMMARY NOTES
-- ------------------------------------------------------------
CREATE POLICY snotes_select ON summary_notes FOR SELECT
  USING (
    is_super_admin()
    OR daily_report_id IN (
      SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
    )
  );

CREATE POLICY snotes_manage ON summary_notes FOR ALL
  USING (
    is_super_admin()
    OR (
      is_petugas_or_above()
      AND daily_report_id IN (
        SELECT id FROM daily_reports WHERE unit_id = get_my_unit_id()
      )
    )
  );


-- ------------------------------------------------------------
-- RLS: AUDIT LOGS
-- ------------------------------------------------------------
CREATE POLICY auditlogs_select ON audit_logs FOR SELECT
  USING (
    is_super_admin()
    OR (is_admin_or_above() AND unit_id = get_my_unit_id())
  );

CREATE POLICY auditlogs_insert ON audit_logs FOR INSERT
  WITH CHECK (FALSE);


-- ============================================================
-- GRANT: anon
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon;
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;


-- ============================================================
-- GRANT: authenticated
-- ============================================================
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  units,
  users,
  facility_categories,
  facilities,
  daily_reports,
  duty_roster,
  facility_status_logs,
  incidents,
  incident_photos,
  followups,
  summary_notes,
  audit_logs
TO authenticated;

GRANT EXECUTE ON FUNCTION get_my_unit_id()     TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role()        TO authenticated;
GRANT EXECUTE ON FUNCTION is_super_admin()     TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin_or_above()  TO authenticated;
GRANT EXECUTE ON FUNCTION is_petugas_or_above() TO authenticated;


-- ============================================================
-- GRANT: service_role
-- ============================================================
GRANT ALL ON ALL TABLES    IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO service_role;


-- ============================================================
-- TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION fn_set_submitted_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    NEW.submitted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_submitted_at
BEFORE UPDATE ON daily_reports
FOR EACH ROW EXECUTE FUNCTION fn_set_submitted_at();

-- --

CREATE OR REPLACE FUNCTION fn_set_reviewed_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'reviewed' AND OLD.status != 'reviewed' THEN
    NEW.reviewed_at = NOW();
    NEW.reviewed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_reviewed_at
BEFORE UPDATE ON daily_reports
FOR EACH ROW EXECUTE FUNCTION fn_set_reviewed_at();

-- --

CREATE OR REPLACE FUNCTION fn_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO users (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Pengguna Baru'),
    'petugas'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION fn_handle_new_user();

-- --

CREATE OR REPLACE FUNCTION fn_audit_daily_report()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
    INSERT INTO audit_logs (user_id, unit_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      auth.uid(),
      NEW.unit_id,
      'STATUS_CHANGE',
      'daily_reports',
      NEW.id,
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_audit_daily_report
AFTER UPDATE ON daily_reports
FOR EACH ROW EXECUTE FUNCTION fn_audit_daily_report();


-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW vw_report_summary AS
SELECT
  dr.id,
  dr.report_date,
  dr.shift,
  dr.status,
  dr.submitted_at,
  dr.reviewed_at,
  un.code         AS unit_code,
  un.name         AS unit_name,
  u.full_name     AS created_by_name,
  r.full_name     AS reviewed_by_name,
  COUNT(fsl.id) FILTER (WHERE fsl.status = 'normal')          AS total_normal,
  COUNT(fsl.id) FILTER (WHERE fsl.status = 'rusak')           AS total_rusak,
  COUNT(fsl.id) FILTER (WHERE fsl.status = 'operasi_menurun') AS total_menurun,
  COUNT(inc.id)                                                AS total_incidents
FROM daily_reports dr
JOIN units un ON un.id = dr.unit_id
JOIN users u  ON u.id  = dr.created_by
LEFT JOIN users r                   ON r.id   = dr.reviewed_by
LEFT JOIN facility_status_logs fsl  ON fsl.daily_report_id = dr.id
LEFT JOIN incidents inc             ON inc.daily_report_id = dr.id
GROUP BY dr.id, un.code, un.name, u.full_name, r.full_name;

ALTER VIEW vw_report_summary SET (security_invoker = true);
GRANT SELECT ON vw_report_summary TO authenticated;

-- --

CREATE OR REPLACE VIEW vw_open_issues AS
SELECT
  i.id            AS incident_id,
  i.title,
  i.description,
  i.incident_time,
  i.status        AS incident_status,
  i.action_taken,
  f.name          AS facility_name,
  fc.name         AS category_name,
  un.code         AS unit_code,
  un.name         AS unit_name,
  u.full_name     AS reported_by_name,
  COUNT(ip.id)    AS photo_count,
  COUNT(fu.id)    AS followup_count
FROM incidents i
JOIN daily_reports dr       ON dr.id  = i.daily_report_id
JOIN units un               ON un.id  = dr.unit_id
JOIN users u                ON u.id   = i.reported_by
LEFT JOIN facilities f      ON f.id   = i.facility_id
LEFT JOIN facility_categories fc ON fc.id = f.category_id
LEFT JOIN incident_photos ip ON ip.incident_id = i.id
LEFT JOIN followups fu       ON fu.incident_id = i.id
WHERE i.status != 'resolved'
GROUP BY i.id, f.name, fc.name, un.code, un.name, u.full_name;

ALTER VIEW vw_open_issues SET (security_invoker = true);
GRANT SELECT ON vw_open_issues TO authenticated;


-- ============================================================
-- END OF SCHEMA v3
-- ============================================================
