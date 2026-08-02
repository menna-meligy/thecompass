-- Each roadmap task gets its own mini-roadmap of steps (so a goal can be broken
-- down and tracked individually). Stored as JSONB: [{id, title, done}].
ALTER TABLE public.user_tasks
  ADD COLUMN IF NOT EXISTS steps JSONB NOT NULL DEFAULT '[]'::jsonb;
