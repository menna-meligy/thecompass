import { NextResponse, type NextRequest } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { parseOfferingKey, capacityFor, type OfferingType } from "@/lib/offerings";
import { normaliseDate, shortTime } from "@/lib/schedule-dates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_BLOCK_START = "00:00";
const DAY_BLOCK_END = "23:59";

/**
 * GET — everything the admin availability calendar needs in one shot: each slot,
 * which offerings it's open for, and who has actually taken it (with the state
 * of their receipt), so the coach can see the schedule ahead of time.
 */
export async function GET(_request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin } = guard;

  const { data: slots, error } = await admin
    .from("availability_slots")
    .select(
      `id, date, start_time, end_time, capacity, base_capacity, booked_count, status,
       admin_marked_status, is_day_block, committed_offering_type, committed_workshop_id,
       slot_assignments(id, offering_type, workshop_id, workshop:workshops(id, title_ar, title_en))`,
    )
    .order("date", { ascending: true })
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const slotIds = (slots ?? []).map((s: any) => s.id);

  let bookingsBySlot = new Map<string, any[]>();
  if (slotIds.length > 0) {
    const { data: bookings } = await admin
      .from("bookings")
      .select(
        `id, slot_id, user_id, status, offering_type, workshop_id, seats,
         slot_reserved_at, created_at,
         user:profiles(full_name, email, phone),
         workshop:workshops(id, title_ar, title_en),
         payment:payments(id, amount, method, status, proof_url, created_at)`,
      )
      .in("slot_id", slotIds)
      .neq("status", "cancelled");

    bookingsBySlot = (bookings ?? []).reduce((acc: Map<string, any[]>, b: any) => {
      const payments = Array.isArray(b.payment) ? b.payment : b.payment ? [b.payment] : [];
      const latest = [...payments].sort(
        (a, z) => new Date(z.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      )[0];
      const list = acc.get(b.slot_id) ?? [];
      list.push({ ...b, payment: latest ?? null });
      acc.set(b.slot_id, list);
      return acc;
    }, new Map<string, any[]>());
  }

  const shaped = (slots ?? []).map((s: any) => ({
    ...s,
    date: normaliseDate(s.date),
    start_time: shortTime(s.start_time),
    end_time: shortTime(s.end_time),
    assignments: s.slot_assignments ?? [],
    bookings: bookingsBySlot.get(s.id) ?? [],
  }));

  return NextResponse.json(shaped);
}

/**
 * POST — two distinct, deliberate actions (never both from one button):
 *
 *   { mode: "available", date, start_time, end_time, offerings: [key, ...] }
 *       → open a bookable time window on that day for the chosen offerings
 *
 *   { mode: "day_block", date }
 *       → close the whole day; nothing on it is bookable
 */
export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const { admin, userId } = guard;

  const body = await request.json().catch(() => ({}));
  const mode: string = body.mode ?? "available";
  const date: string | undefined = body.date;

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  // ── Re-open a previously closed day (without adding times yet) ───────────
  if (mode === "unblock_day") {
    const { error } = await admin
      .from("availability_slots")
      .delete()
      .eq("date", date)
      .eq("is_day_block", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // ── Close the whole day ──────────────────────────────────────────────────
  if (mode === "day_block") {
    const { data: daySlots } = await admin
      .from("availability_slots")
      .select("id")
      .eq("date", date);

    const daySlotIds = (daySlots ?? []).map((s: any) => s.id);
    const { data: held } = daySlotIds.length
      ? await admin
          .from("bookings")
          .select("id")
          .in("slot_id", daySlotIds)
          .not("slot_reserved_at", "is", null)
          .neq("status", "cancelled")
      : { data: [] as any[] };

    if (held && held.length > 0) {
      return NextResponse.json(
        { error: "day_has_bookings", count: held.length },
        { status: 409 },
      );
    }

    const { data: existing } = await admin
      .from("availability_slots")
      .select("id")
      .eq("date", date)
      .eq("is_day_block", true)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, id: existing.id, already: true });
    }

    const { data: created, error } = await admin
      .from("availability_slots")
      .insert({
        date,
        start_time: DAY_BLOCK_START,
        end_time: DAY_BLOCK_END,
        capacity: 0,
        booked_count: 0,
        status: "published",
        admin_marked_status: "unavailable",
        is_day_block: true,
        created_by: userId,
      })
      .select("id")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, id: created?.id });
  }

  // ── Open a bookable window ───────────────────────────────────────────────
  if (mode !== "available") {
    return NextResponse.json({ error: "unknown_mode" }, { status: 400 });
  }

  const startTime: string | undefined = body.start_time;
  const endTime: string | undefined = body.end_time;
  const offeringKeys: string[] = Array.isArray(body.offerings) ? body.offerings : [];

  if (!startTime || !endTime) {
    return NextResponse.json({ error: "start_time and end_time are required" }, { status: 400 });
  }
  if (startTime >= endTime) {
    return NextResponse.json({ error: "end_before_start" }, { status: 400 });
  }
  if (offeringKeys.length === 0) {
    return NextResponse.json({ error: "no_offerings" }, { status: 400 });
  }

  const offerings = offeringKeys.map(parseOfferingKey);
  if (offerings.some((o) => !o)) {
    return NextResponse.json({ error: "unknown_offering" }, { status: 400 });
  }
  const resolved = offerings as { offeringType: OfferingType; workshopId: string | null }[];

  // The most the window could ever seat, given everything it's offered for.
  // Which of those it actually becomes is decided by whoever books it first
  // (see reserve_slot_for_booking) — a 1-on-1 booking collapses it to one seat.
  const capacity = Math.max(...resolved.map((o) => capacityFor(o.offeringType)));

  // Re-opening a day that was previously closed lifts the block.
  await admin.from("availability_slots").delete().eq("date", date).eq("is_day_block", true);

  const { data: existing } = await admin
    .from("availability_slots")
    .select("id, capacity, booked_count")
    .eq("date", date)
    .eq("start_time", startTime)
    .eq("is_day_block", false)
    .maybeSingle();

  let slotId: string;

  if (existing) {
    const { error } = await admin
      .from("availability_slots")
      .update({
        end_time: endTime,
        base_capacity: capacity,
        // Don't disturb a window someone is already holding.
        ...(existing.booked_count === 0
          ? { capacity, admin_marked_status: "available" }
          : {}),
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    slotId = existing.id;
  } else {
    const { data: created, error } = await admin
      .from("availability_slots")
      .insert({
        date,
        start_time: startTime,
        end_time: endTime,
        capacity,
        base_capacity: capacity,
        booked_count: 0,
        status: "published",
        admin_marked_status: "available",
        is_day_block: false,
        created_by: userId,
      })
      .select("id")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    slotId = created!.id;
  }

  // Replace the slot's offerings with exactly what was ticked.
  const { error: delErr } = await admin.from("slot_assignments").delete().eq("slot_id", slotId);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

  const { error: insErr } = await admin.from("slot_assignments").insert(
    resolved.map((o) => ({
      slot_id: slotId,
      offering_type: o.offeringType,
      workshop_id: o.workshopId,
      session_id: null,
    })),
  );
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, id: slotId });
}
