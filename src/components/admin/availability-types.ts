import type { OfferingType } from "@/lib/offerings";

export interface AdminSlotAssignment {
  id: string;
  offering_type: OfferingType | null;
  workshop_id: string | null;
  workshop?: { id: string; title_ar: string; title_en: string } | null;
}

export interface AdminSlotBooking {
  id: string;
  user_id: string;
  status: string;
  offering_type: OfferingType | null;
  workshop_id: string | null;
  seats: number | null;
  slot_reserved_at: string | null;
  created_at: string;
  user?: { full_name: string | null; email: string | null; phone: string | null } | null;
  workshop?: { id: string; title_ar: string; title_en: string } | null;
  payment?: {
    id: string;
    amount: number | null;
    method: string | null;
    status: string | null;
    proof_url: string | null;
    created_at: string | null;
  } | null;
}

export interface AdminSlot {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  status: string;
  admin_marked_status: string | null;
  is_day_block: boolean;
  assignments: AdminSlotAssignment[];
  bookings: AdminSlotBooking[];
}
