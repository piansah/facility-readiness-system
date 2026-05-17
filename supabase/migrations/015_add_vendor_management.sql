-- ============================================================
-- HELPER FUNCTIONS (Ensure they exist to prevent 42883)
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
  SELECT public.get_my_role() = 'super_admin'::public.user_role;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_unit_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

-- ============================================================
-- 15. VENDORS & CONTRACTS MANAGEMENT
-- ============================================================

-- Create Vendors Table
CREATE TABLE IF NOT EXISTS public.vendors (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  unit_id         UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  pic_name        VARCHAR(100),
  pic_phone       VARCHAR(20),
  emergency_phone VARCHAR(20),
  email           VARCHAR(150),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_unit_id ON public.vendors(unit_id);

-- Create Contracts Table
CREATE TABLE IF NOT EXISTS public.contracts (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id              UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  title                  VARCHAR(200) NOT NULL,
  contract_number        VARCHAR(100),
  start_date             DATE,
  end_date               DATE,
  warranty_period_months INT,
  sla_response_hours     INT,
  document_path          TEXT, -- Storage path for contract PDF
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contracts_vendor_id ON public.contracts(vendor_id);

-- Add Columns to Facilities Table for SLA & Warranty Tracking
ALTER TABLE public.facilities 
ADD COLUMN IF NOT EXISTS contract_id UUID REFERENCES public.contracts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS warranty_until DATE;

CREATE INDEX IF NOT EXISTS idx_facilities_contract_id ON public.facilities(contract_id);

-- Create Vendor Service Logs (Log Servis Eksternal)
CREATE TABLE IF NOT EXISTS public.vendor_service_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  incident_id     UUID NOT NULL REFERENCES public.incidents(id) ON DELETE CASCADE,
  vendor_id       UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  called_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at    TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  cost            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  service_details TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vsl_incident_id ON public.vendor_service_logs(incident_id);
CREATE INDEX IF NOT EXISTS idx_vsl_vendor_id ON public.vendor_service_logs(vendor_id);

-- Enable RLS on New Tables
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_service_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- VENDORS POLICIES
DROP POLICY IF EXISTS vendors_select ON public.vendors;
CREATE POLICY vendors_select ON public.vendors FOR SELECT TO authenticated
USING (public.is_super_admin() OR unit_id = public.get_my_unit_id());

DROP POLICY IF EXISTS vendors_manage ON public.vendors;
CREATE POLICY vendors_manage ON public.vendors FOR ALL TO authenticated
USING (public.is_super_admin() OR (public.get_my_role() = 'admin' AND unit_id = public.get_my_unit_id()));

-- CONTRACTS POLICIES
DROP POLICY IF EXISTS contracts_select ON public.contracts;
CREATE POLICY contracts_select ON public.contracts FOR SELECT TO authenticated
USING (
  public.is_super_admin() 
  OR vendor_id IN (SELECT id FROM public.vendors WHERE unit_id = public.get_my_unit_id())
);

DROP POLICY IF EXISTS contracts_manage ON public.contracts;
CREATE POLICY contracts_manage ON public.contracts FOR ALL TO authenticated
USING (
  public.is_super_admin() 
  OR (public.get_my_role() = 'admin' AND vendor_id IN (SELECT id FROM public.vendors WHERE unit_id = public.get_my_unit_id()))
);

-- VENDOR SERVICE LOGS POLICIES
DROP POLICY IF EXISTS vsl_select ON public.vendor_service_logs;
CREATE POLICY vsl_select ON public.vendor_service_logs FOR SELECT TO authenticated
USING (
  public.is_super_admin() 
  OR vendor_id IN (SELECT id FROM public.vendors WHERE unit_id = public.get_my_unit_id())
);

DROP POLICY IF EXISTS vsl_manage ON public.vendor_service_logs;
CREATE POLICY vsl_manage ON public.vendor_service_logs FOR ALL TO authenticated
USING (
  public.is_super_admin() 
  OR (public.get_my_role() = 'admin' AND vendor_id IN (SELECT id FROM public.vendors WHERE unit_id = public.get_my_unit_id()))
);

-- Storage bucket for contracts
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO UPDATE SET public = true;
