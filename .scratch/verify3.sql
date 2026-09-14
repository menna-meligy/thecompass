select conname, pg_get_constraintdef(oid) as def
  from pg_constraint
 where conrelid = 'public.slot_assignments'::regclass
 order by conname;
