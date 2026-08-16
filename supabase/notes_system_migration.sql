-- ============================================================
-- BIDIRECTIONAL NOTES SYSTEM MIGRATION
-- Phase 1: Database Schema Enhancement
-- ============================================================

-- ── 1. Enhance session_reflections table ────────────────────────────────────
-- Add new columns to track publication, mentor notes, and timestamps
ALTER TABLE public.session_reflections
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS mentor_notes_ar TEXT,
ADD COLUMN IF NOT EXISTS mentor_notes_en TEXT,
ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived'));

-- ── 2. Create client_notes table ────────────────────────────────────────────
-- Bidirectional notes from clients about their sessions
CREATE TABLE IF NOT EXISTS public.client_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content_ar TEXT,
  content_en TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(booking_id, is_public)
);

-- ── 3. Create notes_audit_log table ─────────────────────────────────────────
-- Complete audit trail for all note changes
CREATE TABLE IF NOT EXISTS public.notes_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name VARCHAR NOT NULL,
  record_id UUID NOT NULL,
  action VARCHAR NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_data JSONB,
  new_data JSONB
);

-- ── 4. Enable RLS ───────────────────────────────────────────────────────────
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_audit_log ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS Policies for client_notes ────────────────────────────────────────

-- Clients can read their own client_notes
CREATE POLICY "Clients can read their own notes" ON public.client_notes
  FOR SELECT USING (auth.uid() = client_id);

-- Clients can write their own client_notes
CREATE POLICY "Clients can create and update their own notes" ON public.client_notes
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Clients can update their own notes" ON public.client_notes
  FOR UPDATE USING (auth.uid() = client_id);

-- Admins can read all client_notes
CREATE POLICY "Admins can read all client notes" ON public.client_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can manage client_notes
CREATE POLICY "Admins can manage client notes" ON public.client_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 6. Enhanced RLS Policies for session_reflections ────────────────────────

-- Clients can read public reflections (when is_public = true)
CREATE POLICY "Clients can read their public reflections" ON public.session_reflections
  FOR SELECT USING (
    auth.uid() = client_id AND is_public = true
  );

-- Clients can read all their own reflections (including private)
CREATE POLICY "Clients can read all their reflections" ON public.session_reflections
  FOR SELECT USING (auth.uid() = client_id);

-- Admins can read all reflections
CREATE POLICY "Admins can read all reflections (updated)" ON public.session_reflections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Admins can update session_reflections (publish, add mentor notes, change status)
CREATE POLICY "Admins can update reflections (updated)" ON public.session_reflections
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 7. RLS Policies for notes_audit_log ─────────────────────────────────────

-- Admins can read audit logs
CREATE POLICY "Admins can read audit logs" ON public.notes_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- System (SECURITY DEFINER) can insert audit logs
CREATE POLICY "System can insert audit logs" ON public.notes_audit_log
  FOR INSERT WITH CHECK (true);

-- ── 8. Audit trigger for session_reflections ───────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_session_reflections()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, new_data
    ) VALUES (
      'session_reflections',
      NEW.id,
      'INSERT',
      auth.uid(),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, old_data, new_data
    ) VALUES (
      'session_reflections',
      NEW.id,
      'UPDATE',
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, old_data
    ) VALUES (
      'session_reflections',
      OLD.id,
      'DELETE',
      auth.uid(),
      to_jsonb(OLD)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_session_reflections_trigger ON public.session_reflections;
CREATE TRIGGER audit_session_reflections_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.session_reflections
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_session_reflections();

-- ── 9. Audit trigger for client_notes ───────────────────────────────────────

CREATE OR REPLACE FUNCTION public.audit_client_notes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, new_data
    ) VALUES (
      'client_notes',
      NEW.id,
      'INSERT',
      auth.uid(),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, old_data, new_data
    ) VALUES (
      'client_notes',
      NEW.id,
      'UPDATE',
      auth.uid(),
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.notes_audit_log (
      table_name, record_id, action, changed_by, old_data
    ) VALUES (
      'client_notes',
      OLD.id,
      'DELETE',
      auth.uid(),
      to_jsonb(OLD)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_client_notes_trigger ON public.client_notes;
CREATE TRIGGER audit_client_notes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.client_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.audit_client_notes();

-- ── 10. Indexes for performance ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_client_notes_booking ON public.client_notes (booking_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client ON public.client_notes (client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_public ON public.client_notes (is_public);
CREATE INDEX IF NOT EXISTS idx_client_notes_updated ON public.client_notes (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_reflections_client ON public.session_reflections (client_id);
CREATE INDEX IF NOT EXISTS idx_session_reflections_public ON public.session_reflections (is_public);
CREATE INDEX IF NOT EXISTS idx_session_reflections_status ON public.session_reflections (status);
CREATE INDEX IF NOT EXISTS idx_session_reflections_updated ON public.session_reflections (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notes_audit_log_table ON public.notes_audit_log (table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_notes_audit_log_changed ON public.notes_audit_log (changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_audit_log_user ON public.notes_audit_log (changed_by);

-- ── 11. GRANTS ──────────────────────────────────────────────────────────────
-- Allow authenticated users and anon to use the new tables within RLS constraints

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.client_notes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.client_notes TO authenticated;
GRANT SELECT ON public.notes_audit_log TO authenticated;
GRANT INSERT ON public.notes_audit_log TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
