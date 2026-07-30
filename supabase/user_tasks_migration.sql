-- Run this in Supabase Dashboard > SQL Editor
CREATE TABLE IF NOT EXISTS user_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  icon TEXT DEFAULT '🎯',
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','in_progress','done')),
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tasks_self ON user_tasks
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
