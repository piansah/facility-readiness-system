-- ============================================================
-- ELITS FACILITY READINESS REPORTING SYSTEM
-- MASTER SCHEMA v4 (CLEAN FRESH START)
-- Includes all migrations 000 - 014
-- Optimized RLS & Security Definer Helpers to prevent infinite loops
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================
DO $$ BEGIN
    CREATE TYPE public.user_role AS ENUM ('super_admin', 'admin', 'petugas', 'viewer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.shift_type AS ENUM ('pagi', 'malam');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.report_status AS ENUM ('draft', 'submitted', 'reviewed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.facility_status AS ENUM ('normal', 'rusak', 'operasi_menurun');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.incident_status AS ENUM ('open', 'in_progress', 'resolved');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 1. UNITS (unit-unit di dalam Bandara)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.units (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code        VARCHAR(20)  NOT NULL,
  name        VARCHAR(100) NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Locking unit code identity (Migration 012)
CREATE UNIQUE INDEX IF NOT EXISTS units_code_unique_idx ON public.units (code);

-- ============================================================
-- 2. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  unit_id     UUID REFERENCES public.units(id) ON DELETE SET NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  full_name   VARCHAR(100) NOT NULL,
  role        public.user_role NOT NULL DEFAULT 'petugas',
  phone       VARCHAR(20),
  avatar_url  TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. SUPER ADMIN UNIT ACCESS (Migration 008)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.super_admin_unit_access (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, unit_id)
);

-- ============================================================
-- 4. FACILITY CATEGORIES (Migration 004 Scoped)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.facility_categories (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id     UUID REFERENCES public.units(id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  code        VARCHAR(20) NOT NULL UNIQUE,
  icon        VARCHAR(10),
  sort_order  INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_facility_categories_unit ON public.facility_categories(unit_id);

-- ============================================================
-- 5. FACILITIES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.facilities (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id         UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  category_id     UUID NOT NULL REFERENCES public.facility_categories(id),
  name            VARCHAR(100) NOT NULL,
  location_detail VARCHAR(100),
  asset_code      VARCHAR(50),
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order      INT NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_facilities_unit_id ON public.facilities(unit_id);
CREATE INDEX IF NOT EXISTS idx_facilities_category_id ON public.facilities(category_id);

-- ============================================================
-- 5B. DYNAMIC PREVENTIVE MAINTENANCE SCHEDULES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pm_sections (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id     UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  name        VARCHAR(100) NOT NULL,
  color       VARCHAR(30) NOT NULL DEFAULT 'amber',
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, name)
);
CREATE INDEX IF NOT EXISTS idx_pm_sections_unit ON public.pm_sections(unit_id, sort_order);

CREATE TABLE IF NOT EXISTS public.pm_points (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  section_id      UUID NOT NULL REFERENCES public.pm_sections(id) ON DELETE CASCADE,
  unit_id         UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  code            VARCHAR(50) NOT NULL,
  name            VARCHAR(150) NOT NULL,
  location_detail TEXT,
  frequency       VARCHAR(30) NOT NULL DEFAULT 'monthly',
  facility_id     UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  sort_order      INT NOT NULL DEFAULT 0,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, section_id, code)
);
CREATE INDEX IF NOT EXISTS idx_pm_points_unit_section ON public.pm_points(unit_id, section_id, sort_order);

CREATE TABLE IF NOT EXISTS public.pm_schedules (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id          UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  section_id       UUID NOT NULL REFERENCES public.pm_sections(id) ON DELETE CASCADE,
  point_id         UUID NOT NULL REFERENCES public.pm_points(id) ON DELETE CASCADE,
  assigned_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  scheduled_date   DATE NOT NULL,
  shift            public.shift_type,
  status           VARCHAR(30) NOT NULL DEFAULT 'planned',
  notes            TEXT,
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_unit_date ON public.pm_schedules(unit_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_pm_schedules_assigned_user ON public.pm_schedules(assigned_user_id);

-- ============================================================
-- 6. DAILY REPORTS (Includes fields from 006, 011, 014)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.daily_reports (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id             UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES public.users(id),
  report_date         DATE NOT NULL,
  shift               public.shift_type NOT NULL,
  status              public.report_status NOT NULL DEFAULT 'draft',
  submitted_at        TIMESTAMPTZ,
  reviewed_by         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  reviewed_at         TIMESTAMPTZ,
  review_notes        TEXT,
  current_shift_staff JSONB NOT NULL DEFAULT '[]'::jsonb,
  next_shift_staff    JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (unit_id, report_date, shift)
);
CREATE INDEX IF NOT EXISTS idx_daily_reports_unit_date ON public.daily_reports(unit_id, report_date);

-- ============================================================
-- 7. DUTY ROSTER
-- ============================================================
CREATE TABLE IF NOT EXISTS public.duty_roster (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id  UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id),
  shift            public.shift_type NOT NULL,
  role_on_duty     VARCHAR(50),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (daily_report_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_duty_roster_report ON public.duty_roster(daily_report_id);

-- ============================================================
-- 8. FACILITY STATUS LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.facility_status_logs (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id  UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  facility_id      UUID NOT NULL REFERENCES public.facilities(id),
  checked_by       UUID NOT NULL REFERENCES public.users(id),
  status           public.facility_status NOT NULL DEFAULT 'normal',
  notes            TEXT,
  checked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (daily_report_id, facility_id)
);
CREATE INDEX IF NOT EXISTS idx_fsl_report_id ON public.facility_status_logs(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_fsl_facility ON public.facility_status_logs(facility_id);

-- ============================================================
-- 9. INCIDENTS (Includes fields from 005)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incidents (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id         UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  facility_id             UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  reported_by             UUID NOT NULL REFERENCES public.users(id),
  incident_time           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  title                   VARCHAR(200) NOT NULL,
  description             TEXT NOT NULL,
  action_taken            TEXT,
  status                  public.incident_status NOT NULL DEFAULT 'open',
  follow_up_notes         TEXT,
  official_letter_number  TEXT,
  resolved_at             TIMESTAMPTZ,
  followed_up_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  followed_up_at          TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_incidents_report ON public.incidents(daily_report_id);
CREATE INDEX IF NOT EXISTS idx_incidents_facility ON public.incidents(facility_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON public.incidents(status);

-- ============================================================
-- 10. INCIDENT PHOTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.incident_photos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id  UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  caption      TEXT,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_incident_photos_incident ON public.incident_photos(incident_id);

-- ============================================================
-- 11. FOLLOW-UPS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.followups (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id    UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  created_by     UUID NOT NULL REFERENCES public.users(id),
  description    TEXT NOT NULL,
  surat_dinas_no VARCHAR(150),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_followups_incident ON public.followups(incident_id);

-- ============================================================
-- 12. SUMMARY NOTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.summary_notes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_report_id  UUID NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  facility_id      UUID REFERENCES public.facilities(id) ON DELETE SET NULL,
  item_number      INT NOT NULL,
  description      TEXT NOT NULL,
  tindak_lanjut    TEXT,
  is_recurring     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_summary_notes_report ON public.summary_notes(daily_report_id);

-- ============================================================
-- 13. AUDIT LOGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  unit_id     UUID REFERENCES public.units(id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,
  table_name  VARCHAR(50) NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- STORAGE BUCKETS (Migration 014)
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-photos', 'incident-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- ============================================================
-- SAFE RLS HELPER FUNCTIONS (Prevent Infinite Loops)
-- SECURITY DEFINER is critical here!
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_unit_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT unit_id FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_role LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role = 'super_admin'::public.user_role FROM public.users WHERE id = auth.uid();
$$;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: Prevent Unit Code Update
CREATE OR REPLACE FUNCTION public.prevent_unit_code_update()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'Unit code cannot be changed after creation.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_unit_code_update ON public.units;
CREATE TRIGGER trg_prevent_unit_code_update
BEFORE UPDATE OF code ON public.units
FOR EACH ROW EXECUTE FUNCTION public.prevent_unit_code_update();

-- Trigger: Handle New User (Auth to Public sync)
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      split_part(COALESCE(NEW.email, 'Pengguna Baru'), '@', 1),
      'Pengguna Baru'
    ),
    'petugas'::public.user_role,
    TRUE
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_new_user ON auth.users;
CREATE TRIGGER trg_handle_new_user
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- Trigger: Set Submitted At
CREATE OR REPLACE FUNCTION public.fn_set_submitted_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'submitted' AND OLD.status != 'submitted' THEN
    NEW.submitted_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_submitted_at ON public.daily_reports;
CREATE TRIGGER trg_set_submitted_at
BEFORE UPDATE ON public.daily_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_set_submitted_at();

-- Trigger: Set Reviewed At
CREATE OR REPLACE FUNCTION public.fn_set_reviewed_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.status = 'reviewed' AND OLD.status != 'reviewed' THEN
    NEW.reviewed_at = NOW();
    NEW.reviewed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_reviewed_at ON public.daily_reports;
CREATE TRIGGER trg_set_reviewed_at
BEFORE UPDATE ON public.daily_reports
FOR EACH ROW EXECUTE FUNCTION public.fn_set_reviewed_at();

-- ============================================================
-- VIEWS
-- ============================================================
CREATE OR REPLACE VIEW public.vw_report_summary AS
SELECT
  dr.id, dr.report_date, dr.shift, dr.status, dr.submitted_at, dr.reviewed_at,
  un.code AS unit_code, un.name AS unit_name, un.id AS unit_id,
  u.full_name AS created_by_name, r.full_name AS reviewed_by_name,
  COUNT(fsl.id) FILTER (WHERE fsl.status = 'normal') AS total_normal,
  COUNT(fsl.id) FILTER (WHERE fsl.status = 'rusak') AS total_rusak,
  COUNT(fsl.id) FILTER (WHERE fsl.status = 'operasi_menurun') AS total_menurun,
  COUNT(inc.id) AS total_incidents
FROM public.daily_reports dr
JOIN public.units un ON un.id = dr.unit_id
JOIN public.users u  ON u.id  = dr.created_by
LEFT JOIN public.users r ON r.id = dr.reviewed_by
LEFT JOIN public.facility_status_logs fsl ON fsl.daily_report_id = dr.id
LEFT JOIN public.incidents inc ON inc.daily_report_id = dr.id
GROUP BY dr.id, un.id, un.code, un.name, u.full_name, r.full_name;

ALTER VIEW public.vw_report_summary SET (security_invoker = true);

CREATE OR REPLACE VIEW public.vw_open_issues AS
SELECT
  i.id AS incident_id, i.title, i.description, i.incident_time, i.status AS incident_status, i.action_taken,
  f.name AS facility_name, fc.name AS category_name,
  un.code AS unit_code, un.name AS unit_name, un.id AS unit_id,
  u.full_name AS reported_by_name,
  COUNT(ip.id) AS photo_count, COUNT(fu.id) AS followup_count
FROM public.incidents i
JOIN public.daily_reports dr ON dr.id = i.daily_report_id
JOIN public.units un ON un.id = dr.unit_id
JOIN public.users u ON u.id = i.reported_by
LEFT JOIN public.facilities f ON f.id = i.facility_id
LEFT JOIN public.facility_categories fc ON fc.id = f.category_id
LEFT JOIN public.incident_photos ip ON ip.incident_id = i.id
LEFT JOIN public.followups fu ON fu.incident_id = i.id
WHERE i.status != 'resolved'
GROUP BY i.id, f.name, fc.name, un.code, un.name, un.id, u.full_name;

ALTER VIEW public.vw_open_issues SET (security_invoker = true);

-- ============================================================
-- GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated, service_role;

-- ============================================================
-- ROW LEVEL SECURITY ENABLE
-- ============================================================
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.super_admin_unit_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.duty_roster ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facility_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.summary_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES (Safe Subqueries & Security Definers)
-- ============================================================

-- UNITS
DROP POLICY IF EXISTS units_select ON public.units;
CREATE POLICY units_select ON public.units FOR SELECT TO authenticated
USING (public.is_super_admin() OR id = public.get_my_unit_id());

DROP POLICY IF EXISTS units_manage ON public.units;
CREATE POLICY units_manage ON public.units FOR ALL TO authenticated
USING (public.is_super_admin());

-- USERS (Safe Policy to prevent recursion)
DROP POLICY IF EXISTS users_select ON public.users;
CREATE POLICY users_select ON public.users FOR SELECT TO authenticated
USING (
  public.is_super_admin() 
  OR unit_id = public.get_my_unit_id() 
  OR id = auth.uid()
);

DROP POLICY IF EXISTS users_manage ON public.users;
CREATE POLICY users_manage ON public.users FOR ALL TO authenticated
USING (
  public.is_super_admin() 
  OR (public.get_my_role() = 'admin' AND unit_id = public.get_my_unit_id()) 
  OR id = auth.uid()
);

-- SUPER ADMIN UNIT ACCESS
DROP POLICY IF EXISTS saua_select ON public.super_admin_unit_access;
CREATE POLICY saua_select ON public.super_admin_unit_access FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS saua_manage ON public.super_admin_unit_access;
CREATE POLICY saua_manage ON public.super_admin_unit_access FOR ALL TO authenticated
USING (public.is_super_admin());

-- FACILITY CATEGORIES
DROP POLICY IF EXISTS fcat_select ON public.facility_categories;
CREATE POLICY fcat_select ON public.facility_categories FOR SELECT TO authenticated
USING (public.is_super_admin() OR unit_id = public.get_my_unit_id());

DROP POLICY IF EXISTS fcat_manage ON public.facility_categories;
CREATE POLICY fcat_manage ON public.facility_categories FOR ALL TO authenticated
USING (public.is_super_admin() OR (public.get_my_role() = 'admin' AND unit_id = public.get_my_unit_id()));

-- FACILITIES
DROP POLICY IF EXISTS fac_select ON public.facilities;
CREATE POLICY fac_select ON public.facilities FOR SELECT TO authenticated
USING (public.is_super_admin() OR unit_id = public.get_my_unit_id());

DROP POLICY IF EXISTS fac_manage ON public.facilities;
CREATE POLICY fac_manage ON public.facilities FOR ALL TO authenticated
USING (public.is_super_admin() OR (public.get_my_role() = 'admin' AND unit_id = public.get_my_unit_id()));

-- DAILY REPORTS
DROP POLICY IF EXISTS dr_select ON public.daily_reports;
CREATE POLICY dr_select ON public.daily_reports FOR SELECT TO authenticated
USING (
  unit_id = public.get_my_unit_id()
  OR EXISTS (SELECT 1 FROM public.super_admin_unit_access WHERE user_id = auth.uid() AND unit_id = daily_reports.unit_id)
  OR (public.is_super_admin() AND NOT EXISTS (SELECT 1 FROM public.super_admin_unit_access WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS dr_insert ON public.daily_reports;
CREATE POLICY dr_insert ON public.daily_reports FOR INSERT TO authenticated
WITH CHECK (
  public.is_super_admin() 
  OR (unit_id = public.get_my_unit_id() AND public.get_my_role() IN ('petugas', 'admin'))
);

DROP POLICY IF EXISTS dr_update ON public.daily_reports;
CREATE POLICY dr_update ON public.daily_reports FOR UPDATE TO authenticated
USING (
  (public.get_my_role() = 'admin' AND unit_id = public.get_my_unit_id())
  OR (
    public.is_super_admin() AND (
      EXISTS (SELECT 1 FROM public.super_admin_unit_access WHERE user_id = auth.uid() AND unit_id = daily_reports.unit_id)
      OR NOT EXISTS (SELECT 1 FROM public.super_admin_unit_access WHERE user_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS dr_delete ON public.daily_reports;
CREATE POLICY dr_delete ON public.daily_reports FOR DELETE TO authenticated
USING (public.is_super_admin() OR (unit_id = public.get_my_unit_id() AND public.get_my_role() = 'admin'));

-- FACILITY STATUS LOGS
DROP POLICY IF EXISTS fsl_select ON public.facility_status_logs;
CREATE POLICY fsl_select ON public.facility_status_logs FOR SELECT TO authenticated
USING (public.is_super_admin() OR daily_report_id IN (SELECT id FROM public.daily_reports WHERE unit_id = public.get_my_unit_id()));

DROP POLICY IF EXISTS fsl_manage ON public.facility_status_logs;
CREATE POLICY fsl_manage ON public.facility_status_logs FOR ALL TO authenticated
USING (public.is_super_admin() OR daily_report_id IN (SELECT id FROM public.daily_reports WHERE unit_id = public.get_my_unit_id()));

-- INCIDENTS
DROP POLICY IF EXISTS inc_select ON public.incidents;
CREATE POLICY inc_select ON public.incidents FOR SELECT TO authenticated
USING (public.is_super_admin() OR daily_report_id IN (SELECT id FROM public.daily_reports WHERE unit_id = public.get_my_unit_id()));

DROP POLICY IF EXISTS inc_manage ON public.incidents;
CREATE POLICY inc_manage ON public.incidents FOR ALL TO authenticated
USING (public.is_super_admin() OR daily_report_id IN (SELECT id FROM public.daily_reports WHERE unit_id = public.get_my_unit_id()));

-- INCIDENT PHOTOS
DROP POLICY IF EXISTS iphotos_select ON public.incident_photos;
CREATE POLICY iphotos_select ON public.incident_photos FOR SELECT TO authenticated
USING (public.is_super_admin() OR incident_id IN (SELECT i.id FROM public.incidents i JOIN public.daily_reports dr ON dr.id = i.daily_report_id WHERE dr.unit_id = public.get_my_unit_id()));

DROP POLICY IF EXISTS iphotos_manage ON public.incident_photos;
CREATE POLICY iphotos_manage ON public.incident_photos FOR ALL TO authenticated
USING (public.is_super_admin() OR incident_id IN (SELECT i.id FROM public.incidents i JOIN public.daily_reports dr ON dr.id = i.daily_report_id WHERE dr.unit_id = public.get_my_unit_id()));

-- FOLLOWUPS
DROP POLICY IF EXISTS fu_select ON public.followups;
CREATE POLICY fu_select ON public.followups FOR SELECT TO authenticated
USING (public.is_super_admin() OR incident_id IN (SELECT i.id FROM public.incidents i JOIN public.daily_reports dr ON dr.id = i.daily_report_id WHERE dr.unit_id = public.get_my_unit_id()));

DROP POLICY IF EXISTS fu_manage ON public.followups;
CREATE POLICY fu_manage ON public.followups FOR ALL TO authenticated
USING (public.is_super_admin() OR incident_id IN (SELECT i.id FROM public.incidents i JOIN public.daily_reports dr ON dr.id = i.daily_report_id WHERE dr.unit_id = public.get_my_unit_id()));

-- SUMMARY NOTES
DROP POLICY IF EXISTS sn_select ON public.summary_notes;
CREATE POLICY sn_select ON public.summary_notes FOR SELECT TO authenticated
USING (public.is_super_admin() OR daily_report_id IN (SELECT id FROM public.daily_reports WHERE unit_id = public.get_my_unit_id()));

DROP POLICY IF EXISTS sn_manage ON public.summary_notes;
CREATE POLICY sn_manage ON public.summary_notes FOR ALL TO authenticated
USING (public.is_super_admin() OR daily_report_id IN (SELECT id FROM public.daily_reports WHERE unit_id = public.get_my_unit_id()));

-- AUDIT LOGS
DROP POLICY IF EXISTS audit_select ON public.audit_logs;
CREATE POLICY audit_select ON public.audit_logs FOR SELECT TO authenticated
USING (public.is_super_admin() OR (public.get_my_role() = 'admin' AND unit_id = public.get_my_unit_id()));

-- ============================================================
-- DEFAULT SEED DATA
-- ============================================================

-- 1. Insert Default Unit (ELBAN)
INSERT INTO public.units (code, name) 
VALUES ('ELBAN', 'Unit ELBAN')
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Default Facility Categories (Scoped to ELBAN)
DO $$
DECLARE
  v_unit_id UUID;
BEGIN
  SELECT id INTO v_unit_id FROM public.units WHERE code = 'ELBAN' LIMIT 1;
  
  IF v_unit_id IS NOT NULL THEN
    INSERT INTO public.facility_categories (unit_id, name, code, icon, sort_order) VALUES
      (v_unit_id, 'X-ray',             'XRAY',  '📡', 1),
      (v_unit_id, 'WTMD',              'WTMD',  '🚶', 2),
      (v_unit_id, 'Body Scanner',      'BSCAN', '🔵', 3),
      (v_unit_id, 'HHMD',              'HHMD',  '📲', 4),
      (v_unit_id, 'ETD',               'ETD',   '🧪', 5),
      (v_unit_id, 'PAS',               'PAS',   '🎫', 6),
      (v_unit_id, 'Jaringan Ethernet', 'NETW',  '🌐', 7),
      (v_unit_id, 'CCTV',              'CCTV',  '📷', 8),
      (v_unit_id, 'Access Control',    'ACCS',  '🔐', 9),
      (v_unit_id, 'FAS',               'FAS',   '🔥', 10),
      (v_unit_id, 'PABX',              'PABX',  '📞', 11),
      (v_unit_id, 'FIDS',              'FIDS',  '🖥️', 12),
      (v_unit_id, 'BAS',               'BAS',   '🏗️', 13)
    ON CONFLICT (code) DO NOTHING;
  END IF;
END $$;

