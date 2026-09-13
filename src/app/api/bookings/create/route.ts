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

    // Try to ensure user profile exists - insert if missing, ignore if exists
    console.log('📋 Checking if profile exists for user:', userId);
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      console.log('Profile missing - attempting to create');
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: `user-${userId}@albosla.local`,
          role: 'user'
        });

      if (insertError) {
        console.error('❌ Failed to create profile:', { userId, error: insertError });
        // Don't fail here - if profile insert fails, the booking insert will fail with a clearer error
        // This logs the issue for debugging
      } else {
        console.log('✅ Profile created for user:', userId);
      }
    } else {
      console.log('✅ Profile already exists for user:', userId);
    }

    const bookingId = crypto.randomUUID();
    const now = new Date().toISOString();

    // Create booking - use session_id if time_slot_id not available
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        id: bookingId,
        user_id: userId,
        session_id: slotId,
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
