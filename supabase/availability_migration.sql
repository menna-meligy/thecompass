-- Availability tables for Al-Bosla admin scheduling
-- Run this in Supabase Dashboard > SQL Editor

-- Weekly availability rules (e.g., "Every Monday 10:00-12:00")
CREATE TABLE IF NOT EXISTS availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week smallint NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday
  start_time time NOT NULL,
  end_time time NOT NULL,
  session_duration_minutes integer NOT NULL DEFAULT 60,
  buffer_minutes integer NOT NULL DEFAULT 15,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Date-specific exceptions (block a day, or add a one-off slot)
CREATE TABLE IF NOT EXISTS availability_exceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exception_date date NOT NULL,
  exception_type text NOT NULL CHECK (exception_type IN ('blocked', 'extra')),
  start_time time,  -- only for 'extra' type
  end_time time,    -- only for 'extra' type
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Booking settings (single row)
CREATE TABLE IF NOT EXISTS availability_settings (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- enforce single row
  max_advance_days integer NOT NULL DEFAULT 60,      -- how far ahead clients can book
  min_advance_hours integer NOT NULL DEFAULT 24,     -- minimum notice required
  max_bookings_per_day integer NOT NULL DEFAULT 5,
  auto_confirm boolean NOT NULL DEFAULT false,       -- auto-confirm on proof submit
  updated_at timestamptz DEFAULT now()
);

INSERT INTO availability_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS: only admin can manage these tables
ALTER TABLE availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_all_availability_rules" ON availability_rules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_availability_exceptions" ON availability_exceptions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admin_all_availability_settings" ON availability_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Allow clients to read availability_rules (for booking UI)
CREATE POLICY "public_read_availability_rules" ON availability_rules
  FOR SELECT USING (is_active = true);

CREATE POLICY "public_read_availability_exceptions" ON availability_exceptions
  FOR SELECT USING (true);

-- Update trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER availability_rules_updated_at
  BEFORE UPDATE ON availability_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER availability_settings_updated_at
  BEFORE UPDATE ON availability_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
