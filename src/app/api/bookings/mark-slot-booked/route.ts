import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { booking_id, capacity = 1 } = await req.json();

    if (!booking_id) {
      return NextResponse.json(
        { error: 'booking_id is required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get the booking to find its slot_id
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('slot_id')
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', booking_id);
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    const slotId = booking.slot_id;
    if (!slotId) {
      return NextResponse.json(
        { error: 'No slot associated with booking' },
        { status: 400 }
      );
    }

    // Increment booked_count for the slot
    const { data: slot, error: slotError } = await supabase
      .from('availability_slots')
      .select('booked_count')
      .eq('id', slotId)
      .single();

    if (slotError || !slot) {
      console.error('Slot not found:', slotId);
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      );
    }

    // Update booked_count with the capacity (number of people in workshop)
    const newBookedCount = slot.booked_count + capacity;
    const { error: updateError } = await supabase
      .from('availability_slots')
      .update({ booked_count: newBookedCount })
      .eq('id', slotId);

    if (updateError) {
      console.error('Failed to update slot:', updateError);
      return NextResponse.json(
        { error: 'Failed to update slot availability' },
        { status: 500 }
      );
    }

    console.log(`✅ Slot ${slotId} marked as booked. New count: ${newBookedCount}`);
    return NextResponse.json({
      success: true,
      slot_id: slotId,
      booked_count: newBookedCount,
    });
  } catch (err) {
    console.error('Mark slot booked error:', err);
    return NextResponse.json(
      { error: 'Failed to mark slot as booked' },
      { status: 500 }
    );
  }
}
