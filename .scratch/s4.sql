select id, session_id, time_slot_id, slot_id, status, scheduled_at, created_at from bookings order by created_at;
select id, booking_id, amount, method, status, (proof_url is not null) has_proof, (receipt_image_url is not null) has_receipt_img, admin_approved, created_at from payments order by created_at;
select id, slot_date::text, slot_time::text, workshop_title, price, receipt_url, status, uploaded_at from pending_receipts order by uploaded_at;
select role, count(*) from profiles group by role;
