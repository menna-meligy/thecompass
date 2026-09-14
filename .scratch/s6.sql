select status, count(*) n, count(slot_id) with_slot, count(session_id) with_session, count(time_slot_id) with_timeslot from bookings group by status;
select status, method, count(*) n, count(proof_url) n_proof from payments group by status, method;
select status, count(*) n from pending_receipts group by status;
select role, count(*) n from profiles group by role;
