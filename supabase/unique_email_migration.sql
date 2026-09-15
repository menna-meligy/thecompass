-- Enforce one account per email address (case-insensitive) at the database level.
-- Supabase Auth already blocks duplicate signups against auth.users, but
-- public.profiles.email was left without a constraint, so anything writing to it
-- directly (admin scripts, backfills) could still create a duplicate row.

-- Surface any existing duplicates first — resolve these manually before the
-- constraint below can be added; the migration will fail loudly if any exist
-- rather than silently deleting someone's data.
select lower(email) as email, count(*)
from public.profiles
group by lower(email)
having count(*) > 1;

create unique index if not exists profiles_email_unique_idx
  on public.profiles (lower(email));
