const { createClient } = require('@supabase/supabase-js');

async function check() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: payments, error } = await supabase
    .from('payments')
    .select('*')
    .limit(5);

  if (error) {
    console.error('ERROR:', error.message);
  } else {
    console.log('Payments:', JSON.stringify(payments, null, 2));
  }
}

check();
