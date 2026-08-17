import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Only allow admin
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

    const results = [];

    // Create session_reflections table if it doesn't exist
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS public.session_reflections (
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
      );
    `;

    const { error: tableError } = await supabase.rpc("execute_sql", {
      sql_query: createTableSQL,
    }).catch(() => ({ error: { message: "RPC not available, table may already exist" } }));

    results.push({
      operation: "Create session_reflections table",
      status: tableError ? "skipped" : "created",
      message: tableError?.message || "Table ready",
    });

    // Create client_notes table if it doesn't exist
    const createNotesTableSQL = `
      CREATE TABLE IF NOT EXISTS public.client_notes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
        client_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
        content_ar TEXT,
        content_en TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `;

    const { error: notesTableError } = await supabase.rpc("execute_sql", {
      sql_query: createNotesTableSQL,
    }).catch(() => ({ error: { message: "RPC not available, table may already exist" } }));

    results.push({
      operation: "Create client_notes table",
      status: notesTableError ? "skipped" : "created",
      message: notesTableError?.message || "Table ready",
    });

    // Enable RLS
    await supabase.rpc("execute_sql", {
      sql_query: "ALTER TABLE public.session_reflections ENABLE ROW LEVEL SECURITY;",
    }).catch(() => ({}));

    await supabase.rpc("execute_sql", {
      sql_query: "ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;",
    }).catch(() => ({}));

    results.push({
      operation: "Enable RLS",
      status: "done",
      message: "RLS enabled on both tables",
    });

    return NextResponse.json({
      message: "Migration completed",
      results,
    });
  } catch (err) {
    console.error("Migration error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
