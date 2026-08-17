import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if we already have test data
    const { data: existingBookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id)
      .limit(1);

    if (existingBookings?.length > 0) {
      const booking = existingBookings[0];
      const { data: reflection } = await supabase
        .from("session_reflections")
        .select("*")
        .eq("booking_id", booking.id)
        .single();

      return NextResponse.json({
        message: "Test data already exists",
        booking,
        reflection,
      });
    }

    // Create test workshop
    const { data: workshop, error: workshopError } = await supabase
      .from("workshops")
      .insert({
        title_ar: "ورشة اختبار",
        title_en: "Test Workshop",
        description_ar: "ورشة لاختبار نظام الملاحظات",
        description_en: "Test workshop for notes system",
        topic: "test",
      })
      .select()
      .single();

    if (workshopError) {
      return NextResponse.json(
        { error: "Workshop creation failed: " + workshopError.message },
        { status: 500 }
      );
    }

    // Create test session
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 3600000);

    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .insert({
        workshop_id: workshop.id,
        type: "group",
        price: 0,
        capacity: 5,
        starts_at: now.toISOString(),
        ends_at: oneHourLater.toISOString(),
        status: "published",
      })
      .select()
      .single();

    if (sessionError) {
      return NextResponse.json(
        { error: "Session creation failed: " + sessionError.message },
        { status: 500 }
      );
    }

    // Create test booking
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: user.id,
        session_id: session.id,
        status: "confirmed",
      })
      .select()
      .single();

    if (bookingError) {
      return NextResponse.json(
        { error: "Booking creation failed: " + bookingError.message },
        { status: 500 }
      );
    }

    // Create test reflection
    const { data: reflection, error: refError } = await supabase
      .from("session_reflections")
      .insert({
        booking_id: booking.id,
        client_id: user.id,
        encouragement_ar:
          "ممتاز! أنت بتحرز تقدم رائع جداً! استمر كده وروح بقوة! 💪",
        encouragement_en:
          "Excellent! You're making amazing progress! Keep it up! 💪",
        mentor_id: user.id,
        status: "published",
        submitted_at: now.toISOString(),
      })
      .select()
      .single();

    if (refError) {
      return NextResponse.json(
        { error: "Reflection creation failed: " + refError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Test data seeded successfully",
      workshop,
      session,
      booking,
      reflection,
    });
  } catch (err) {
    console.error("Seed error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
