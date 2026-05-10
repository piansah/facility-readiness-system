-- One-time correction before operational use:
-- the ELIT unit code was a bootstrap typo and should be ELBAN.

DROP TRIGGER IF EXISTS trg_prevent_unit_code_update ON public.units;

UPDATE public.units
SET code = 'ELBAN'
WHERE code = 'ELIT';

CREATE TRIGGER trg_prevent_unit_code_update
BEFORE UPDATE OF code ON public.units
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unit_code_update();
