select id, name, public from storage.buckets order by id;
select routine_name from information_schema.routines where routine_schema='public' order by 1;
select conname, pg_get_constraintdef(oid) from pg_constraint where conrelid in ('public.bookings'::regclass,'public.payments'::regclass,'public.availability_slots'::regclass,'public.slot_assignments'::regclass) order by conrelid::text, conname;
