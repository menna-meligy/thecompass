import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated", details: authError?.message },
        { status: 401 }
      );
    }

    const debug: {
      user_id: string;
      user_email: string | undefined;
      checks: Array<{ check: string; status: string; [key: string]: unknown }>;
    } = {
      user_id: user.id,
      user_email: user.email,
      checks: [],
    };

    // Check 1: User profile exists and has admin role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    debug.checks.push({
      check: "User profile",
      status: profileError ? "ERROR" : "OK",
      data: profile,
      error: profileError?.message,
    });

    // Check 2: Count of bookings for this user
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", user.id);

    debug.checks.push({
      check: "User bookings",
      count: bookings?.length || 0,
      status: bookingsError ? "ERROR" : "OK",
      error: bookingsError?.message,
    });

    // Check 3: Count of reflections where client_id = user.id
    const { data: reflections, error: reflectionsError } = await supabase
      .from("session_reflections")
      .select("*")
      .eq("client_id", user.id);

    debug.checks.push({
      check: "Reflections for this client",
      count: reflections?.length || 0,
      data: reflections || [],
      status: reflectionsError ? "ERROR" : "OK",
      error: reflectionsError?.message,
    });

    // Check 4: Count of ALL reflections (admin check)
    const { data: allReflections, error: allReflectionsError } = await supabase
      .from("session_reflections")
      .select("*")
      .limit(10);

    debug.checks.push({
      check: "All reflections in database (first 10)",
      count: allReflections?.length || 0,
      data: allReflections || [],
      status: allReflectionsError ? "ERROR" : "OK",
      error: allReflectionsError?.message,
    });

    // Check 5: Workshops
    const { data: workshops, error: workshopsError } = await supabase
      .from("workshops")
      .select("*")
      .limit(5);

    debug.checks.push({
      check: "Workshops (first 5)",
      count: workshops?.length || 0,
      status: workshopsError ? "ERROR" : "OK",
      error: workshopsError?.message,
    });

    // Check 6: Sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select("*")
      .limit(5);

    debug.checks.push({
      check: "Sessions (first 5)",
      count: sessions?.length || 0,
      status: sessionsError ? "ERROR" : "OK",
      error: sessionsError?.message,
    });

    return NextResponse.json(debug);
  } catch (err) {
    console.error("Debug error:", err);
    return NextResponse.json(
      { error: "Internal error", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Create test data
    const result = {
      created: [],
      errors: [],
    };

    // Create workshop
    const { data: workshop, error: wError } = await supabase
      .from("workshops")
      .insert({
        title_ar: "ورشة اختبار الملاحظات",
        title_en: "Notes Test Workshop",
        description_ar: "ورشة لاختبار نظام الملاحظات ثنائي الاتجاه",
        description_en: "Workshop to test bidirectional notes",
        topic: "test",
      })
      .select()
      .single();

    if (wError) {
      result.errors.push({ step: "workshop", error: wError.message });
    } else {
      result.created.push({ type: "workshop", id: workshop?.id });

      // Create session
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 3600000);

      const { data: session, error: sError } = await supabase
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

      if (sError) {
        result.errors.push({ step: "session", error: sError.message });
      } else {
        result.created.push({ type: "session", id: session?.id });

        // Create booking
        const { data: booking, error: bError } = await supabase
          .from("bookings")
          .insert({
            user_id: user.id,
            session_id: session.id,
            status: "confirmed",
          })
          .select()
          .single();

        if (bError) {
          result.errors.push({ step: "booking", error: bError.message });
        } else {
          result.created.push({ type: "booking", id: booking?.id });

          // Create reflection
          const { data: reflection, error: rError } = await supabase
            .from("session_reflections")
            .insert({
              booking_id: booking.id,
              client_id: user.id,
              encouragement_ar:
                "ممتاز جداً! أنت بتحرز تقدم رائع وبتركز كويس جداً! استمر كده يا شطور! 🌟",
              encouragement_en:
                "Excellent work! You're making great progress and focusing well! Keep it up! 🌟",
              mentor_id: user.id,
              status: "published",
              submitted_at: now.toISOString(),
            })
            .select()
            .single();

          if (rError) {
            result.errors.push({ step: "reflection", error: rError.message });
          } else {
            result.created.push({ type: "reflection", id: reflection?.id });
          }
        }
      }
    }

    return NextResponse.json({
      message: "Test data creation attempt complete",
      ...result,
    });
  } catch (err) {
    console.error("Create error:", err);
    return NextResponse.json(
      { error: "Internal error", details: String(err) },
      { status: 500 }
    );
  }
}
