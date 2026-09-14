alter table public.slot_assignments
  drop constraint if exists slot_assignments_check;
alter table public.slot_assignments
  drop constraint if exists slot_assignments_offering_shape_check;
alter table public.slot_assignments
  add constraint slot_assignments_offering_shape_check
  check (
    (offering_type = 'career' and workshop_id is null)
    or (offering_type in ('individual', 'group') and workshop_id is not null)
  );
