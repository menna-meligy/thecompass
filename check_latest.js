const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supabase = createClient(
    'https://irinehjflompktssnbwa.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaW5laGpmbG9tcGt0c3NuYndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3ODg0NSwiZXhwIjoyMDk1NzU0ODQ1fQ.hA0842J4vq-nVz7MIl3S_Qnc0EDcaQK3TdQUcmFJec4'
  );

  // Get ALL payments ordered by created_at DESC
  const { data: allPayments } = await supabase
    .from('payments')
    .select('id, booking_id, status, proof_url, receipt_image_url, created_at')
    .order('created_at', { ascending: false });
  
  console.log('ALL PAYMENTS IN DATABASE:');
  console.log(JSON.stringify(allPayments, null, 2));
  
  // Check bookings with full payment data
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, created_at, status, payment:payments(id, status, proof_url, receipt_image_url)')
    .order('created_at', { ascending: false })
    .limit(5);
  
  console.log('\n\nBOOKINGS WITH PAYMENT RELATIONSHIP:');
  console.log(JSON.stringify(bookings, null, 2));
}

check();
