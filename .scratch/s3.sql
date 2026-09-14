select id, title_en, topic, spots_available from workshops order by created_at;
select id, date, start_time, end_time, capacity, booked_count, status, admin_marked_status from availability_slots order by date, start_time;
