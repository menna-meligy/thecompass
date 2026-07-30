-- Add track column: mentee (client's goals), mentor (coach's notes), session (booking milestone)
ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS track TEXT NOT NULL DEFAULT 'mentee'
  CHECK (track IN ('mentee', 'mentor', 'session'));

ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS user_tasks_track_idx ON public.user_tasks (user_id, track);

-- Allow admins to read/write any user's tasks (for mentor track)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'user_tasks' AND policyname = 'Admins can manage all user_tasks'
  ) THEN
    CREATE POLICY "Admins can manage all user_tasks"
      ON public.user_tasks FOR ALL
      USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
