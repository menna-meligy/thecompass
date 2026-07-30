-- ============================================================
-- COMPASS SELF-ASSESSMENT TABLES
-- ============================================================

-- assessments: one row per completed assessment per user
CREATE TABLE IF NOT EXISTS public.assessments (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id      UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  locale         TEXT NOT NULL DEFAULT 'ar',
  completed_at   TIMESTAMPTZ,
  dimension_scores JSONB,          -- {HAP, DIR, PRD, CNF, COM, NRG} each 1.0–4.0
  happiness_score  NUMERIC(4,2),   -- avg of HAP + NRG
  recommended_type TEXT,           -- 'workshop' | 'session'
  recommended_workshop_id UUID REFERENCES public.workshops(id) ON DELETE SET NULL,
  result_snapshot JSONB,           -- immutable snapshot of the full reading
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own assessments" ON public.assessments
  FOR ALL USING (auth.uid() = client_id);

CREATE POLICY "Admins can read all assessments" ON public.assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Index for fast "latest assessment" lookups
CREATE INDEX IF NOT EXISTS idx_assessments_client_completed
  ON public.assessments (client_id, completed_at DESC);
