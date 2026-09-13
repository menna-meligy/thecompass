-- ============================================================
-- BOOKING WORKFLOW MIGRATION
-- Enhances bookings for centralized availability slots with
-- receipt upload, admin approval, and Google Meet integration
-- ============================================================

-- 1. Add slot_id to bookings table (alongside session_id for backwards compatibility)
ALTER TABLE IF EXISTS public.bookings ADD COLUMN slot_id UUID REFERENCES public.availability_slots(id) ON DELETE CASCADE;

-- 2. Add Google Meet link and approval tracking to bookings
ALTER TABLE IF EXISTS public.bookings ADD COLUMN google_meet_link TEXT;
ALTER TABLE IF EXISTS public.bookings ADD COLUMN scheduled_at TIMESTAMPTZ;

-- 3. Add admin approval fields to payments table
ALTER TABLE IF EXISTS public.payments
  ADD COLUMN IF NOT EXISTS admin_notes_ar TEXT,
  ADD COLUMN IF NOT EXISTS admin_notes_en TEXT,
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS receipt_image_url TEXT;

-- 4. Update payments status to include manual approval workflow
-- The check constraint already includes 'pending_verification', which covers manual review

-- 5. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_at ON public.bookings(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_payments_approved_by ON public.payments(approved_by);
CREATE INDEX IF NOT EXISTS idx_payments_approved_at ON public.payments(approved_at);

-- 6. Create function to increment booked_count on availability_slots when a booking is created
CREATE OR REPLACE FUNCTION update_slot_booked_count()
RETURNS TRIGGER AS $$
BEGIN
  -- When a booking is created and confirmed, increment booked_count
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
    UPDATE public.availability_slots
    SET booked_count = booked_count + 1
    WHERE id = NEW.slot_id;
  END IF;

  -- When a booking is cancelled/removed, decrement booked_count
  IF NEW.status IN ('cancelled', 'completed') AND OLD.status NOT IN ('cancelled', 'completed') THEN
    UPDATE public.availability_slots
    SET booked_count = GREATEST(booked_count - 1, 0)
    WHERE id = NEW.slot_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS update_slot_booked_count_trigger ON public.bookings;
CREATE TRIGGER update_slot_booked_count_trigger
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_slot_booked_count();

-- 7. Create function to prevent overbooking (slot at capacity)
CREATE OR REPLACE FUNCTION check_slot_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity INTEGER;
  v_booked_count INTEGER;
BEGIN
  IF NEW.slot_id IS NOT NULL THEN
    SELECT capacity, booked_count INTO v_capacity, v_booked_count
    FROM public.availability_slots
    WHERE id = NEW.slot_id;

    IF v_booked_count >= v_capacity THEN
      RAISE EXCEPTION 'This time slot is at full capacity';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists and create new one
DROP TRIGGER IF EXISTS check_slot_capacity_trigger ON public.bookings;
CREATE TRIGGER check_slot_capacity_trigger
  BEFORE INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_slot_capacity();

-- 8. Update RLS policies for bookings to support new workflow
ALTER TABLE IF EXISTS public.bookings ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can manage all bookings" ON public.bookings;

-- Create new policies
CREATE POLICY "Users can view their own bookings" ON public.bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bookings" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 9. Update RLS for payments table for admin approval
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can view and approve payments" ON public.payments;

CREATE POLICY "Users can view their own payments" ON public.payments
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view and approve all payments" ON public.payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can update their own payments" ON public.payments
  FOR UPDATE USING (user_id = auth.uid());
