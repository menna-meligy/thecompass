const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supabase = createClient(
    'https://irinehjflompktssnbwa.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyaW5laGpmbG9tcGt0c3NuYndhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDE3ODg0NSwiZXhwIjoyMDk1NzU0ODQ1fQ.hA0842J4vq-nVz7MIl3S_Qnc0EDcaQK3TdQUcmFJec4'
  );

  // Check admin@albosla.test profile
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .or('email.eq.admin@albosla.test,email.eq.albosla@admin');

  console.log('Admin Profiles:');
  console.log(JSON.stringify(profiles, null, 2));
}

check();
