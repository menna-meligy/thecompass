import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all pending verification payments with related booking and user info
    const { data: payments, error } = await supabase
      .from('payments')
      .select(
        `
        *,
        booking:bookings(id, user_id, session_id, created_at),
        user:profiles(full_name, email)
        `
      )
      .eq('status', 'pending_verification')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Payment fetch error:', error);
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
