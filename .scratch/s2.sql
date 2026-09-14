select id, title_en, title_ar, topic, spots_available from workshops order by created_at;
select id, date, start_time, end_time, capacity, booked_count, status, admin_marked_status from availability_slots order by date, start_time;
select sa.slot_id, s.date, s.start_time, sa.session_id, sa.workshop_id, w.title_en from slot_assignments sa left join availability_slots s on s.id=sa.slot_id left join workshops w on w.id=sa.workshop_id order by s.date, s.start_time;
select id, user_id, session_id, time_slot_id, slot_id, status, scheduled_at, created_at from bookings order by created_at;
select id, booking_id, user_id, amount, method, status, proof_url, receipt_image_url, admin_approved, created_at from payments order by created_at;
select id, user_id, slot_date, slot_time, workshop_title, price, receipt_url, status, uploaded_at from pending_receipts order by uploaded_at;
select id, email, full_name, role from profiles order by created_at;
