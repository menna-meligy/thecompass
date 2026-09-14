const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supabase = createClient(
    'https://irinehjflompktssnbwa.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaW5laGpmbG9tcGt0c3NuYndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3ODg0NSwiZXhwIjoyMDk1NzU0ODQ1fQ.hA0842J4vq-nVz7MIl3S_Qnc0EDcaQK3TdQUcmFJec4'
  );

  // Get the bookings admin view with payment data (like the admin page does)
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, status, payment:payments(id, status, proof_url, receipt_image_url)')
    .limit(1);

  if (error) {
    console.error('ERROR:', error);
  } else {
    console.log(JSON.stringify(bookings, null, 2));
  }
}

check();
