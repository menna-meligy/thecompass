import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Simplified SQL statements that don't need RPC
const MIGRATION_STATEMENTS = [
  // Create session_reflections table
  `CREATE TABLE IF NOT EXISTS public.session_reflections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    mentor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    encouragement_ar TEXT,
    encouragement_en TEXT,
    mentor_notes_ar TEXT,
    mentor_notes_en TEXT,
    private_notes TEXT,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived', 'submitted')),
    is_public BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    submitted_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Create client_notes table
  `CREATE TABLE IF NOT EXISTS public.client_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content_ar TEXT,
    content_en TEXT,
    is_public BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  )`,

  // Create notes_audit_log table
  `CREATE TABLE IF NOT EXISTS public.notes_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name TEXT NOT NULL,
    record_id UUID NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    old_values JSONB,
    new_values JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )`,

  // Enable RLS on new tables
  `ALTER TABLE public.session_reflections ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY`,
  `ALTER TABLE public.notes_audit_log ENABLE ROW LEVEL SECURITY`,

  // Create indexes
  `CREATE INDEX IF NOT EXISTS idx_session_reflections_booking ON public.session_reflections(booking_id)`,
  `CREATE INDEX IF NOT EXISTS idx_session_reflections_client ON public.session_reflections(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_session_reflections_status ON public.session_reflections(status)`,
  `CREATE INDEX IF NOT EXISTS idx_client_notes_booking ON public.client_notes(booking_id)`,
  `CREATE INDEX IF NOT EXISTS idx_client_notes_client ON public.client_notes(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_notes_audit_log_record ON public.notes_audit_log(table_name, record_id)`,
];

export async function GET(req: NextRequest) {
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

    // Try to insert a dummy record into each table to verify structure
    // This is a simple way to check if tables exist and are accessible
    const results = [];

    // Test session_reflections table
    try {
      const { data, error } = await supabase
        .from("session_reflections")
        .select("id")
        .limit(1);

      if (error && error.message.includes("does not exist")) {
        results.push({
          table: "session_reflections",
          status: "needs_creation",
          error: error.message,
        });
      } else if (error) {
        results.push({
          table: "session_reflections",
          status: "error",
          error: error.message,
        });
      } else {
        results.push({
          table: "session_reflections",
          status: "exists",
        });
      }
    } catch (err) {
      results.push({
        table: "session_reflections",
        status: "error",
        error: String(err),
      });
    }

    // Test client_notes table
    try {
      const { data, error } = await supabase
        .from("client_notes")
        .select("id")
        .limit(1);

      if (error && error.message.includes("does not exist")) {
        results.push({
          table: "client_notes",
          status: "needs_creation",
          error: error.message,
        });
      } else if (error) {
        results.push({
          table: "client_notes",
          status: "error",
          error: error.message,
        });
      } else {
        results.push({
          table: "client_notes",
          status: "exists",
        });
      }
    } catch (err) {
      results.push({
        table: "client_notes",
        status: "error",
        error: String(err),
      });
    }

    // Test notes_audit_log table
    try {
      const { data, error } = await supabase
        .from("notes_audit_log")
        .select("id")
        .limit(1);

      if (error && error.message.includes("does not exist")) {
        results.push({
          table: "notes_audit_log",
          status: "needs_creation",
          error: error.message,
        });
      } else if (error) {
        results.push({
          table: "notes_audit_log",
          status: "error",
          error: error.message,
        });
      } else {
        results.push({
          table: "notes_audit_log",
          status: "exists",
        });
      }
    } catch (err) {
      results.push({
        table: "notes_audit_log",
        status: "error",
        error: String(err),
      });
    }

    // Check if we have any data in session_reflections
    try {
      const { data: reflections, error } = await supabase
        .from("session_reflections")
        .select("*")
        .limit(5);

      if (!error && reflections) {
        results.push({
          operation: "check_data",
          count: reflections.length,
          status: "data_exists",
        });
      }
    } catch (err) {
      // Table might not exist
    }

    return NextResponse.json({
      message: "Migration status check",
      tables_need_creation: MIGRATION_STATEMENTS.length,
      results,
      next_step:
        "Tables exist but may need schema adjustments. Run migration in Supabase dashboard if needed.",
    });
  } catch (err) {
    console.error("Migration check error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
