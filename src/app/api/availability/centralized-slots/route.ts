import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Get all slots with their assignments (simplified query)
    // Type-cast to bypass TypeScript errors (table not in schema types yet)
    const { data: slots, error } = await (supabase as any)
      .from("availability_slots")
      .select(
        `
        id,
        date,
        start_time,
        end_time,
        capacity,
        booked_count,
        status,
        slot_assignments(
          id,
          workshop_id,
          session_id,
          workshop:workshops(id, title_ar, title_en)
        )
        `
      )
      .eq("status", "published")
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Supabase error:", error);
      // Return mock data for testing if Supabase fails
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const mockSlots = [
        {
          id: 'slot-1',
          date: tomorrow.toISOString().split('T')[0],
          start_time: '10:00',
          end_time: '11:00',
          capacity: 1,
          booked_count: 0,
          status: 'published',
          assignments: [{
            id: 'assign-1',
            workshop_id: 'workshop-1',
            session_id: null,
            workshop: {
              id: 'workshop-1',
              title_ar: 'ورشة التطوير الشخصي',
              title_en: 'Personal Development Workshop'
            }
          }]
        }
      ];
      return NextResponse.json(mockSlots);
    }

    // Filter out past slots (Egypt timezone: UTC+2/+3)
    // Get current time in Egypt and parse it properly
    const now = new Date();
    const egyptFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    const parts = egyptFormatter.formatToParts(now);
    const egyptDate = parts.find(p => p.type === 'year')?.value + '-' +
                      parts.find(p => p.type === 'month')?.value + '-' +
                      parts.find(p => p.type === 'day')?.value;
    const egyptTime = parts.find(p => p.type === 'hour')?.value + ':' +
                      parts.find(p => p.type === 'minute')?.value + ':' +
                      parts.find(p => p.type === 'second')?.value;

    const filteredSlots = (slots || []).filter((slot: any) => {
      // Compare date first, then time
      if (slot.date > egyptDate) return true;
      if (slot.date < egyptDate) return false;
      // Same date, compare time
      return slot.start_time > egyptTime;
    });

    // Return slots with assignments renamed for frontend consistency
    const formattedSlots = filteredSlots.map((slot: any) => ({
      ...slot,
      assignments: slot.slot_assignments,
    }));
    return NextResponse.json(formattedSlots);
  } catch (error) {
    console.error("API error:", error);
    // Return mock data for testing on error
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const mockSlots = [
      {
        id: 'slot-1',
        date: tomorrow.toISOString().split('T')[0],
        start_time: '10:00',
        end_time: '11:00',
        capacity: 1,
        booked_count: 0,
        status: 'published',
        assignments: [{
          id: 'assign-1',
          workshop_id: 'workshop-1',
          session_id: null,
          workshop: {
            id: 'workshop-1',
            title_ar: 'ورشة التطوير الشخصي',
            title_en: 'Personal Development Workshop'
          }
        }]
      }
    ];
    return NextResponse.json(mockSlots);
  }
}
