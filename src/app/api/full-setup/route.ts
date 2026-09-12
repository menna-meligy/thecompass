import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Complete SQL setup for production
const SETUP_SQL = `
-- Create client_notes table
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

-- Create notes_audit_log table
CREATE TABLE IF NOT EXISTS public.notes_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  old_values JSONB,
  new_values JSONB,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.client_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes_audit_log ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_client_notes_booking ON public.client_notes(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_client ON public.client_notes(client_id);
CREATE INDEX IF NOT EXISTS idx_client_notes_is_public ON public.client_notes(is_public);
CREATE INDEX IF NOT EXISTS idx_notes_audit_log_record ON public.notes_audit_log(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_notes_audit_log_timestamp ON public.notes_audit_log(timestamp DESC);

-- RLS Policies for client_notes
CREATE POLICY IF NOT EXISTS "Clients can read their own notes" ON public.client_notes
  FOR SELECT USING (auth.uid() = client_id);

CREATE POLICY IF NOT EXISTS "Admins can read all client notes" ON public.client_notes
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY IF NOT EXISTS "Clients can create their own notes" ON public.client_notes
  FOR INSERT WITH CHECK (auth.uid() = client_id);

CREATE POLICY IF NOT EXISTS "Clients can update their own notes" ON public.client_notes
  FOR UPDATE USING (auth.uid() = client_id);

CREATE POLICY IF NOT EXISTS "Clients can delete their own notes" ON public.client_notes
  FOR DELETE USING (auth.uid() = client_id);

-- RLS Policies for session_reflections (ensure proper access)
CREATE POLICY IF NOT EXISTS "Clients can read their own reflections" ON public.session_reflections
  FOR SELECT USING (auth.uid() = client_id OR status = 'published');

CREATE POLICY IF NOT EXISTS "Admins can manage reflections" ON public.session_reflections
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for notes_audit_log
CREATE POLICY IF NOT EXISTS "Admins can read audit logs" ON public.notes_audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

SELECT 'Setup complete' as status;
`;

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

    const results: {
      tables_created: Array<{ table: string; status: string; error?: string }>;
      policies_applied: Array<any>;
      errors: Array<any>;
      summary: { tables_status: string; policies_status: string; ready_for_testing: boolean };
    } = {
      tables_created: [],
      policies_applied: [],
      errors: [],
      summary: {
        tables_status: "checking",
        policies_status: "checking",
        ready_for_testing: false,
      },
    };

    // Check each table
    const tableChecks = [
      { name: "client_notes", test: true },
      { name: "notes_audit_log", test: true },
      { name: "session_reflections", test: true },
    ];

    for (const table of tableChecks) {
      try {
        const { data, error } = await (supabase as any)
          .from(table.name)
          .select("id")
          .limit(1);

        if (error) {
          if (error.message.includes("does not exist")) {
            results.tables_created.push({
              table: table.name,
              status: "missing_needs_sql",
              error: error.message,
            });
          } else {
            results.tables_created.push({
              table: table.name,
              status: "error",
              error: error.message,
            });
          }
        } else {
          results.tables_created.push({
            table: table.name,
            status: "exists",
          });
        }
      } catch (err) {
        results.errors.push({
          table: table.name,
          error: String(err),
        });
      }
    }

    // Check RLS policies
    try {
      const { data: policies, error } = await supabase.rpc(
        "get_policies",
        {}
      ).catch(() => ({ data: null, error: null }));

      results.policies_applied.push({
        policies: "RLS policies configured (check Supabase dashboard)",
        status: "needs_verification",
      });
    } catch (err) {
      results.policies_applied.push({
        status: "error",
        error: String(err),
      });
    }

    // Determine overall status
    const allTablesExist = results.tables_created.every(
      (t) => t.status === "exists"
    );
    results.summary.tables_status = allTablesExist ? "ready" : "needs_setup";
    results.summary.ready_for_testing =
      allTablesExist && results.errors.length === 0;

    return NextResponse.json({
      message: "Database setup verification complete",
      ...results,
      sql_to_execute: results.summary.tables_status === "needs_setup" ? SETUP_SQL : null,
      next_step:
        results.summary.ready_for_testing
          ? "Call /api/test/seed-data to create test data"
          : "Execute SQL above in Supabase dashboard then call this endpoint again",
    });
  } catch (err) {
    console.error("Setup error:", err);
    return NextResponse.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
