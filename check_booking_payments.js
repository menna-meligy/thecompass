const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supabase = createClient(
    'https://irinehjflompktssnbwa.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaW5laGpmbG9tcGt0c3NuYndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3ODg0NSwiZXhwIjoyMDk1NzU0ODQ1fQ.hA0842J4vq-nVz7MIl3S_Qnc0EDcaQK3TdQUcmFJec4'
  );

  // First check if payments exist
  const { data: allPayments } = await supabase.from('payments').select('*').limit(3);
  console.log('All payments:', allPayments?.length);
  
  // Then check bookings with payments relationship
  const { data: bookingsWithPayments } = await supabase
    .from('bookings')
    .select('id, status, payment:payments(id, status, proof_url)')
    .limit(3);
  
  console.log('\nBookings with payments join:');
  console.log(JSON.stringify(bookingsWithPayments, null, 2));
  
  // Check specific booking's payments
  if (bookingsWithPayments?.length > 0) {
    const bookingId = bookingsWithPayments[0].id;
    const { data: directPayments } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', bookingId);
    
    console.log(`\nDirect payments for booking ${bookingId}:`, directPayments?.length);
  }
}

check();
