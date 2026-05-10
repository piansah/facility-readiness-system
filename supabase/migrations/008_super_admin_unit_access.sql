-- Migration 008: Super Admin Multi-Unit Access Mapping
-- This table allows a Super Admin to be assigned to specific units.

CREATE TABLE IF NOT EXISTS public.super_admin_unit_access (
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (user_id, unit_id)
);

-- Enable RLS
ALTER TABLE public.super_admin_unit_access ENABLE ROW LEVEL SECURITY;

-- 1. Deny everything to anon by default (standard Supabase)
REVOKE ALL ON public.super_admin_unit_access FROM anon;

-- 2. Grant basic access to authenticated users
GRANT SELECT ON public.super_admin_unit_access TO authenticated;

-- 3. RLS Policy: Users can see their own unit assignments
CREATE POLICY "Users can view their own unit assignments" 
ON public.super_admin_unit_access
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- 4. RLS Policy: Super Admins can manage all assignments
CREATE POLICY "Super Admins can manage all unit assignments" 
ON public.super_admin_unit_access
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE id = auth.uid() AND role = 'super_admin'
    )
);

-- Add helpful comment
COMMENT ON TABLE public.super_admin_unit_access IS 'Mapping table for Super Admins who manage specific subsets of units.';
