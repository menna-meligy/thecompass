select s.id, s.date::text, s.start_time::text, s.end_time::text, s.capacity, s.booked_count,
       s.status, s.admin_marked_status, s.is_day_block,
       coalesce(string_agg(a.offering_type || coalesce(':'||left(a.workshop_id::text,8),''), ', '), '-') as offerings
  from availability_slots s
  left join slot_assignments a on a.slot_id = s.id
 group by s.id, s.date, s.start_time, s.end_time, s.capacity, s.booked_count, s.status, s.admin_marked_status, s.is_day_block
 order by s.date, s.start_time;
select proname, pg_get_function_identity_arguments(oid) args from pg_proc where proname in ('reserve_slot_for_booking','release_slot_for_booking');
select id, name, public from storage.buckets order by id;
