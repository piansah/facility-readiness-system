-- Report review and approval signatures are owned by unit admins only.
-- Super admins can monitor reports through SELECT policies, but cannot approve/reject them.

DROP POLICY IF EXISTS "Admins can review reports based on assignment" ON public.daily_reports;

CREATE POLICY "Unit admins can review reports"
ON public.daily_reports
FOR UPDATE
TO authenticated
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  AND unit_id = (SELECT unit_id FROM public.users WHERE id = auth.uid())
)
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
  AND unit_id = (SELECT unit_id FROM public.users WHERE id = auth.uid())
);
