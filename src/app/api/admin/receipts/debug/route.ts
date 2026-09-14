import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Debug endpoint to verify receipts in the system
 * Shows receipts from payments table and their status
 */
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

    // Get all payments with receipts
    const { data: allPayments, error: allError } = await supabase
      .from('payments')
      .select('id, booking_id, status, proof_url, created_at, user_id')
      .not('proof_url', 'is', null)
      .order('created_at', { ascending: false });

    if (allError) {
      return NextResponse.json(
        { error: allError.message },
        { status: 400 }
      );
    }

    // Get specifically pending verification receipts
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payments')
      .select('id, booking_id, status, proof_url, created_at, user_id')
      .eq('status', 'pending_verification')
      .order('created_at', { ascending: false });

    if (pendingError) {
      return NextResponse.json(
        { error: pendingError.message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      summary: {
        totalWithReceipts: allPayments?.length || 0,
        pendingVerification: pendingPayments?.length || 0,
      },
      allReceiptedPayments: allPayments || [],
      pendingPayments: pendingPayments || [],
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to debug receipts' },
      { status: 500 }
    );
  }
}
