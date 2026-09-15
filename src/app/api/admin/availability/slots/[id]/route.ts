import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  // Never silently delete a slot a client is holding — their booking would be
  // orphaned and the coach would lose the appointment from the schedule.
  const { data: held } = await admin
    .from("bookings")
    .select("id")
    .eq("slot_id", id)
    .not("slot_reserved_at", "is", null)
    .neq("status", "cancelled")
    .limit(1);

  if (held && held.length > 0) {
    return NextResponse.json(
      // The UI turns this code into a localised message and offers to cancel
      // the holder right there, rather than leaving the coach stuck.
      { error: "has_bookings" },
      { status: 409 },
    );
  }

  const { error } = await admin.from("availability_slots").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
