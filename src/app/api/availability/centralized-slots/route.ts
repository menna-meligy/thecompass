import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { parseOfferingKey, type OfferingType } from "@/lib/offerings";
import { isPastSlot, normaliseDate, shortTime, cairoNow } from "@/lib/schedule-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public availability feed. One endpoint for all four offerings, so the career
 * session and the three workshops can never drift apart.
 *
 * GET /api/availability/centralized-slots?offering=career
 * GET /api/availability/centralized-slots?offering=<workshopId>:individual
 * GET /api/availability/centralized-slots?offering=<workshopId>:group
 *
 * Returns only slots a client can actually take right now: published, not on a
 * blocked day, not marked unavailable, still has a free seat, and not in the
 * past (Cairo wall-clock). A slot held by someone who has uploaded a receipt is
 * already counted in booked_count, so it disappears here for everyone else the
 * moment that receipt lands — which is exactly what "taken" means.
 */

interface SlotAssignmentRow {
  offering_type: OfferingType | null;
  workshop_id: string | null;
}

interface SlotRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  status: string;
  admin_marked_status: string | null;
  is_day_block: boolean | null;
  committed_offering_type: OfferingType | null;
  committed_workshop_id: string | null;
  slot_assignments: SlotAssignmentRow[] | null;
}

export async function GET(request: NextRequest) {
  try {
    const offeringParam = request.nextUrl.searchParams.get("offering");
    const offering = parseOfferingKey(offeringParam);

    if (offeringParam && !offering) {
      return NextResponse.json({ error: "unknown_offering" }, { status: 400 });
    }

    const supabase = await createAdminClient();
    const today = cairoNow().date;

    const { data, error } = await (supabase as any)
      .from("availability_slots")
      .select(
        `id, date, start_time, end_time, capacity, booked_count, status,
         admin_marked_status, is_day_block, committed_offering_type, committed_workshop_id,
         slot_assignments(offering_type, workshop_id)`,
      )
      .eq("status", "published")
      .gte("date", today)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("centralized-slots query failed:", error.message);
      return NextResponse.json({ slots: [], blockedDates: [] });
    }

    const rows = (data ?? []) as SlotRow[];

    // Days the admin closed entirely — greyed out on every calendar.
    const blockedDates = Array.from(
      new Set(rows.filter((r) => r.is_day_block).map((r) => normaliseDate(r.date))),
    );
    const blocked = new Set(blockedDates);

    const slots = rows
      .filter((row) => {
        if (row.is_day_block) return false;
        if (blocked.has(normaliseDate(row.date))) return false;
        if ((row.admin_marked_status ?? "available") !== "available") return false;
        if (row.booked_count >= row.capacity) return false;
        if (isPastSlot(row.date, row.start_time)) return false;

        if (!offering) return true;

        // Once someone has taken this window it IS that thing — a group cohort
        // with seats left is still only open to that same group, never to a
        // 1-on-1 that would double-book the coach.
        if (row.committed_offering_type) {
          return (
            row.committed_offering_type === offering.offeringType &&
            (row.committed_workshop_id ?? null) === offering.workshopId
          );
        }

        return (row.slot_assignments ?? []).some(
          (a) =>
            a.offering_type === offering.offeringType &&
            (a.workshop_id ?? null) === offering.workshopId,
        );
      })
      .map((row) => ({
        id: row.id,
        date: normaliseDate(row.date),
        start_time: shortTime(row.start_time),
        end_time: shortTime(row.end_time),
        capacity: row.capacity,
        booked_count: row.booked_count,
        seats_left: Math.max(0, row.capacity - row.booked_count),
        offerings: (row.slot_assignments ?? [])
          .filter((a) => a.offering_type)
          .map((a) => ({ offering_type: a.offering_type, workshop_id: a.workshop_id })),
      }));

    return NextResponse.json({ slots, blockedDates });
  } catch (err) {
    console.error("centralized-slots error:", err);
    return NextResponse.json({ slots: [], blockedDates: [] });
  }
}
