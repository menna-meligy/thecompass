-- ============================================================
-- SESSION NOTES MIGRATION (Phase 3: Bidirectional Notes)
-- Run after skills_migration.sql
-- ============================================================

-- ── 1. Session notes (client public and private notes) ──────────────────────

CREATE TABLE IF NOT EXISTS public.session_notes (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id        UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_ar        TEXT NOT NULL,
  content_en        TEXT NOT NULL,
  is_public         BOOLEAN NOT NULL DEFAULT false,  -- true = visible to mentor/admin, false = private
  version           INTEGER NOT NULL DEFAULT 1,      -- for concurrent edit detection
  created_by        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT session_notes_belongs_to_client CHECK (client_id = (SELECT user_id FROM public.bookings WHERE id = booking_id))
);

-- ── 2. Update session_reflections to include mentor notes ──────────────────

ALTER TABLE public.session_reflections
  ADD COLUMN IF NOT EXISTS mentor_notes_ar TEXT,
  ADD COLUMN IF NOT EXISTS mentor_notes_en TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'published')),
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ── 3. Indexes ───────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_session_notes_booking ON public.session_notes (booking_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_client ON public.session_notes (client_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_created_at ON public.session_notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_notes_is_public ON public.session_notes (is_public);
CREATE INDEX IF NOT EXISTS idx_session_reflections_booking ON public.session_reflections (booking_id);
CREATE INDEX IF NOT EXISTS idx_session_reflections_client ON public.session_reflections (client_id);

-- ── 4. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- session_notes: clients can read their own (both public and private),
--                admins can read all public notes and notes for their sessions
CREATE POLICY "Clients can read their own notes" ON public.session_notes
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY "Admins can read public notes" ON public.session_notes
  FOR SELECT USING (
    is_public = true AND
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Clients can create notes" ON public.session_notes
  FOR INSERT WITH CHECK (auth.uid() = client_id AND auth.uid() = created_by);

CREATE POLICY "Clients can update their own notes" ON public.session_notes
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY "Clients can delete their own notes" ON public.session_notes
  FOR DELETE USING (auth.uid() = client_id);

-- session_reflections: clients can read their encouragement (public fields),
--                      admins can read and write all fields
CREATE POLICY "Clients can view their reflection encouragement" ON public.session_reflections
  FOR SELECT USING (
    auth.uid() = client_id AND status = 'published'
  );

CREATE POLICY "Admins can view all reflections" ON public.session_reflections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can create reflections" ON public.session_reflections
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update reflections" ON public.session_reflections
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 5. Audit trail (append-only log for tracking changes) ──────────────────

CREATE TABLE IF NOT EXISTS public.notes_audit_log (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name      TEXT NOT NULL,
  record_id       UUID NOT NULL,
  operation       TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_values      JSONB,
  new_values      JSONB,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_audit_log_record ON public.notes_audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_notes_audit_log_timestamp ON public.notes_audit_log (timestamp DESC);

ALTER TABLE public.notes_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit logs" ON public.notes_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
