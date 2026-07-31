-- Enforce one compass assessment per client per 30 days at the DB level.
-- Backstop for the UI/eligibility gate — prevents bypass via direct insert/API.

CREATE OR REPLACE FUNCTION public.enforce_assessment_cooldown()
RETURNS TRIGGER AS $$
DECLARE
  last_at timestamptz;
BEGIN
  SELECT max(coalesce(completed_at, created_at)) INTO last_at
  FROM public.assessments
  WHERE client_id = NEW.client_id;

  IF last_at IS NOT NULL
     AND (coalesce(NEW.completed_at, now()) - last_at) < interval '30 days' THEN
    RAISE EXCEPTION 'assessment_cooldown: one reading allowed every 30 days (last was %)', last_at
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_assessment_cooldown ON public.assessments;
CREATE TRIGGER trg_assessment_cooldown
  BEFORE INSERT ON public.assessments
  FOR EACH ROW EXECUTE FUNCTION public.enforce_assessment_cooldown();
