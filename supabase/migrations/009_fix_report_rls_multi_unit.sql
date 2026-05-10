-- Update RLS for daily_reports to support multi-unit super admin access
DROP POLICY IF EXISTS "Users can view reports in their unit" ON public.daily_reports;
DROP POLICY IF EXISTS "Super admins can view all reports" ON public.daily_reports;

-- Policy for viewing reports
CREATE POLICY "Users can view reports based on assignment"
ON public.daily_reports
FOR SELECT
TO authenticated
USING (
    -- 1. Regular Users/Admins: Same unit
    unit_id = (SELECT unit_id FROM public.users WHERE id = auth.uid())
    OR
    -- 2. Super Admins: Check mapping table
    EXISTS (
        SELECT 1 FROM public.super_admin_unit_access 
        WHERE user_id = auth.uid() AND unit_id = daily_reports.unit_id
    )
    OR
    -- 3. Global Super Admins (No specific mapping = see everything)
    (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
        AND NOT EXISTS (SELECT 1 FROM public.super_admin_unit_access WHERE user_id = auth.uid())
    )
);

-- Policy for Reviewing (Update)
DROP POLICY IF EXISTS "Admins can review reports in their unit" ON public.daily_reports;
CREATE POLICY "Admins can review reports based on assignment"
ON public.daily_reports
FOR UPDATE
TO authenticated
USING (
    (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
        AND unit_id = (SELECT unit_id FROM public.users WHERE id = auth.uid())
    )
    OR
    (
        (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
        AND (
            EXISTS (SELECT 1 FROM public.super_admin_unit_access WHERE user_id = auth.uid() AND unit_id = daily_reports.unit_id)
            OR NOT EXISTS (SELECT 1 FROM public.super_admin_unit_access WHERE user_id = auth.uid())
        )
    )
)
WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) IN ('admin', 'super_admin')
);
