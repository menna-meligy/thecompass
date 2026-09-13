import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Get all pending verification payments with related booking and user info
    const { data: payments, error } = await supabase
      .from('payments')
      .select(
        `
        *,
        booking:bookings(id, user_id, slot_id, scheduled_at),
        user:profiles(full_name, email)
        `
      )
      .eq('status', 'pending_verification')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(payments || []);
  } catch (error) {
    console.error('Error fetching payments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    );
  }
}
