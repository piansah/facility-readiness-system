-- Unit code is a stable operational identifier (ELIT, AVSEC, TEKNIK).
-- It must be unique and should not be changed after creation.

CREATE UNIQUE INDEX IF NOT EXISTS units_code_unique_idx
ON public.units (code);

CREATE OR REPLACE FUNCTION public.prevent_unit_code_update()
RETURNS trigger
LANGUAGE plpgsql
AS $$
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
FOR EACH ROW
EXECUTE FUNCTION public.prevent_unit_code_update();
