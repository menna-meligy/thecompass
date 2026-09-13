import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const googleMeetLink = process.env.NEXT_PUBLIC_GOOGLE_MEET_LINK || 'https://meet.google.com/kcv-icuc-ovm';

export async function POST(req: NextRequest) {
  try {
    const { paymentId, approved, notesAr, notesEn, adminId } = await req.json();

    if (!paymentId || approved === undefined || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Verify admin role
    const { data: admin, error: adminError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminId)
      .single();

    if (adminError || admin?.role !== 'admin') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Get payment and booking details
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, booking:bookings(id, user_id, slot_id, scheduled_at)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    const newStatus = approved ? 'paid' : 'failed';

    // Update payment
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        admin_notes_ar: notesAr || null,
        admin_notes_en: notesEn || null,
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // If approved, update booking status and send Google Meet link
    if (approved) {
      const { data: updatedBooking, error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          google_meet_link: googleMeetLink,
        })
        .eq('id', payment.booking.id)
        .select()
        .single();

      if (bookingError) {
        console.error('Booking update error:', bookingError);
      }

      return NextResponse.json({
        success: true,
        payment: updatedPayment,
        booking: updatedBooking || payment.booking,
        meetLink: googleMeetLink,
      });
    } else {
      // If rejected, update booking status
      const { data: updatedBooking, error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'cancelled',
        })
        .eq('id', payment.booking.id)
        .select()
        .single();

      if (bookingError) {
        console.error('Booking update error:', bookingError);
      }

      return NextResponse.json({
        success: true,
        payment: updatedPayment,
        booking: updatedBooking || payment.booking,
      });
    }
  } catch (error) {
    console.error('Payment approval error:', error);
    return NextResponse.json(
      { error: 'Failed to approve payment' },
      { status: 500 }
    );
  }
}
