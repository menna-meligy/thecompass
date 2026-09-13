import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const supabase = createClient(supabaseUrl, supabaseServiceRole);
  const { userId, slotId } = await req.json();

  console.log('Creating booking:', { userId, slotId });

  const { data, error } = await supabase
    .from('bookings')
    .insert({
      id: crypto.randomUUID(),
      user_id: userId,
      session_id: slotId,
      status: 'pending',
      created_at: new Date().toISOString(),
    })
    .select();

  console.log('Insert result:', { data, error });

  if (error) {
    return NextResponse.json({
      error: true,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    }, { status: 400 });
  }

  return NextResponse.json({ success: true, data });
}
