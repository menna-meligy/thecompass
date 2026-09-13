-- ============================================================
-- CENTRALIZED AVAILABILITY CALENDAR MIGRATION
-- Creates a master calendar system where admins create slots once
-- and assign them to multiple workshops/sessions
-- ============================================================

-- 1. Create master availability slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 1,
  booked_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(date, start_time, end_time)
);

-- 2. Create slot assignments table (links slots to sessions/workshops)
CREATE TABLE IF NOT EXISTS public.slot_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID NOT NULL REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE,
  workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (session_id IS NOT NULL OR workshop_id IS NOT NULL)
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_availability_slots_date ON public.availability_slots(date);
CREATE INDEX IF NOT EXISTS idx_availability_slots_created_by ON public.availability_slots(created_by);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_slot ON public.slot_assignments(slot_id);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_session ON public.slot_assignments(session_id);
CREATE INDEX IF NOT EXISTS idx_slot_assignments_workshop ON public.slot_assignments(workshop_id);

-- 4. Enable RLS
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slot_assignments ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for availability_slots
CREATE POLICY "Anyone can view availability slots" ON public.availability_slots
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert availability slots" ON public.availability_slots
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update availability slots" ON public.availability_slots
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete availability slots" ON public.availability_slots
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 6. RLS Policies for slot_assignments
CREATE POLICY "Anyone can view slot assignments" ON public.slot_assignments
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert slot assignments" ON public.slot_assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update slot assignments" ON public.slot_assignments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete slot assignments" ON public.slot_assignments
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 7. Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_availability_slots_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_availability_slots_timestamp_trigger ON public.availability_slots;
CREATE TRIGGER update_availability_slots_timestamp_trigger
  BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW
  EXECUTE FUNCTION update_availability_slots_timestamp();
