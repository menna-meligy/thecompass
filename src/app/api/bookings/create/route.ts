import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { slotId, userId, payment_method, amount, locale = 'en' } = await req.json();
    const isAr = locale === 'ar';

    console.log('📝 BOOKING REQUEST:', { slotId, userId, payment_method, amount, locale });

    if (!slotId || !userId) {
      console.error('Missing required params:', { slotId, userId });
      const message = isAr
        ? 'المعاملات المطلوبة مفقودة. يرجى إعادة المحاولة.'
        : 'Missing required information. Please try again.';
      return NextResponse.json({ error: message }, { status: 400 });
    }

    // Validate userId is a proper UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(userId)) {
      console.error('❌ Invalid userId format:', userId);
      const message = isAr
        ? 'معرف المستخدم غير صالح. يرجى تسجيل الخروج والدخول مرة أخرى.'
        : 'Invalid user ID. Please log out and log back in.';
      return NextResponse.json(
        { error: message },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Ensure user profile exists - use upsert to handle both new and existing users
    console.log('📋 Ensuring profile exists for user:', userId);
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        email: `user-${userId}@albosla.local`,
        role: 'user'
      });

    if (profileError) {
      console.error('❌ Failed to ensure profile:', {
        userId,
        error: {
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint
        }
      });
      // Profile creation/update failed - this MUST be fixed before booking can proceed
      const message = isAr
        ? 'حدثت مشكلة في حسابك. يرجى التواصل مع الدعم الفني.'
        : 'There was an issue with your account. Please contact support.';
      return NextResponse.json(
        {
          error: 'profile_creation_failed',
          message,
          code: profileError.code,
          details: profileError.details
        },
        { status: 400 }
      );
    } else {
      console.log('✅ Profile ensured for user:', userId);
    }

    const bookingId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create booking using slot_id for availability slots
    // For backwards compatibility, also try to get session_id from slot assignments
    const { data: slotAssignment } = await supabase
      .from('slot_assignments')
      .select('session_id')
      .eq('slot_id', slotId)
      .maybeSingle();

    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        user_id: userId,
        session_id: slotAssignment?.session_id || null, // Only set if slot has a session assignment
        slot_id: slotId, // Use slot_id for availability slot bookings
        status: 'pending',
        created_at: now,
      })
      .select()
      .single();

    if (bookingError) {
      console.error('BOOKING_ERROR:', {
        message: bookingError.message,
        code: bookingError.code,
        details: bookingError.details,
        hint: bookingError.hint,
      });

      // Provide user-friendly error messages in the appropriate language
      let userMessage = isAr
        ? 'فشل في إنشاء الحجز. يرجى المحاولة مرة أخرى.'
        : 'Failed to create booking. Please try again.';

      if (bookingError.code === '23503' || bookingError.message?.includes('foreign key')) {
        userMessage = isAr
          ? 'حدثت مشكلة في حسابك. يرجى تسجيل الخروج والدخول مرة أخرى ثم حاول مرة أخرى.'
          : 'There was an issue with your account. Please log out and log back in, then try again.';
      } else if (bookingError.message?.includes('violates unique constraint')) {
        userMessage = isAr
          ? 'هذه الجلسة محجوزة بالفعل. يرجى اختيار وقت مختلف.'
          : 'This session is already booked. Please choose a different time.';
      }

      return NextResponse.json(
        {
          error: 'booking_failed',
          message: userMessage,
          code: bookingError.code
        },
        { status: 400 }
      );
    }

    // Increment booked_count for the slot to mark it as booked
    console.log('📊 Incrementing booked_count for slot:', slotId);
    const { error: slotUpdateError } = await (supabase as any)
      .rpc('increment_slot_bookings', { slot_id: slotId });

    if (slotUpdateError) {
      // Fallback: manual increment if RPC not available
      const { data: slot } = await supabase
        .from('availability_slots')
        .select('booked_count')
        .eq('id', slotId)
        .single();

      if (slot) {
        await supabase
          .from('availability_slots')
          .update({ booked_count: slot.booked_count + 1 })
          .eq('id', slotId);
      }
    }

    // Create payment
    const { data: paymentData, error: paymentError } = await supabase
      .from('payments')
      .insert({
        booking_id: bookingId,
        user_id: userId,
        amount: amount || 500,
        currency: 'EGP',
        method: payment_method || 'instapay',
        status: 'pending',
        created_at: now,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('PAYMENT_ERROR:', {
        message: paymentError.message,
        code: paymentError.code,
        details: paymentError.details,
        hint: paymentError.hint,
      });
      return NextResponse.json(
        {
          error: 'payment_failed',
          message: paymentError.message || 'Failed to create payment',
          code: paymentError.code
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      booking: { id: bookingId },
      payment: { id: paymentData?.id },
      success: true
    });
  } catch (err) {
    console.error('BOOKING_CREATE_ERROR:', err);
    return NextResponse.json(
      { error: 'error', message: String(err) },
      { status: 500 }
    );
  }
}
