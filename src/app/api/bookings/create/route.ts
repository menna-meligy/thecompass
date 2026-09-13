import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { slotId, userId, payment_method, amount } = await req.json();

    if (!slotId || !userId) {
      return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const bookingId = crypto.randomUUID();

    // Create booking
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        user_id: userId,
        session_id: slotId,
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (bookingError) {
      console.log('BOOKING_ERROR:', JSON.stringify(bookingError));
      return NextResponse.json({ error: 'booking_failed', message: 'Booking error' }, { status: 400 });
    }

    // Create payment
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        amount: amount || 500,
        currency: 'EGP',
        method: payment_method || 'instapay',
        status: 'pending',
        created_at: new Date().toISOString(),
      });

    if (paymentError) {
      console.log('PAYMENT_ERROR:', JSON.stringify(paymentError));
      return NextResponse.json({
        error: 'payment_failed',
        message: paymentError.message || 'Payment creation failed',
        code: paymentError.code,
        details: paymentError.details
      }, { status: 400 });
    }

    return NextResponse.json({
      booking: { id: bookingId },
      success: true
    });
  } catch (err) {
    console.log('ERROR:', err);
    return NextResponse.json({ error: 'error', message: String(err) }, { status: 500 });
  }
}
