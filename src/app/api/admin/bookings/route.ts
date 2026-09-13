import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Admin API endpoint for fetching all bookings with comprehensive payment and receipt data.
 * Returns:
 * - All bookings with booking_id, user_id, slot info, status
 * - Payment info (amount, method, status, proof_url)
 * - Receipt verification status and details
 * - Creation timestamp
 * - Support for filtering, pagination, and search
 */

interface BookingRow {
  id: string;
  user_id: string;
  session_id: string;
  status: string;
  created_at: string;
  payment_deadline?: string;
  user?: { full_name?: string; email?: string; phone?: string };
  session?: {
    starts_at?: string;
    ends_at?: string;
    location_or_link?: string;
    price?: number;
    type?: string;
    workshop?: { title_ar?: string; title_en?: string };
  };
  payment?: {
    id?: string;
    amount?: number;
    currency?: string;
    method?: string;
    status?: string;
    proof_url?: string;
    gateway_txn_id?: string;
    admin_approved?: boolean;
    approved_at?: string;
    admin_approval_notes_ar?: string;
    admin_approval_notes_en?: string;
    created_at?: string;
  };
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin authorization
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") || "50"));
    const offset = (page - 1) * pageSize;
    const status = searchParams.get("status") || null;
    const search = searchParams.get("search") || null;
    const paymentStatus = searchParams.get("paymentStatus") || null;
    const receiptStatus = searchParams.get("receiptStatus") || null; // 'pending_verification', 'verified', 'rejected', 'none'
    const sortBy = searchParams.get("sortBy") || "created_at"; // 'created_at', 'payment_deadline', 'session_date'
    const sortOrder = searchParams.get("sortOrder") || "desc"; // 'asc', 'desc'

    // Build query - fetch all bookings with related data
    let query = supabase
      .from("bookings")
      .select(
        "id, user_id, session_id, status, created_at, payment_deadline, user:profiles(full_name, email, phone), session:sessions(starts_at, ends_at, location_or_link, price, type, workshop:workshops(title_ar, title_en)), payment:payments(id, amount, currency, method, status, proof_url, gateway_txn_id, admin_approved, approved_at, admin_approval_notes_ar, admin_approval_notes_en, created_at)",
        { count: "exact" }
      );

    // Apply filters
    if (status) {
      query = query.eq("status", status);
    }

    // Filter by payment status if specified
    if (paymentStatus) {
      // This requires a more complex join which we'll handle in post-processing
    }

    // Sort
    if (sortBy === "created_at") {
      query = query.order("created_at", { ascending: sortOrder === "asc" });
    } else if (sortBy === "payment_deadline") {
      query = query.order("payment_deadline", {
        ascending: sortOrder === "asc",
        nullsFirst: false,
      });
    }

    // Pagination
    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Post-process: normalize payment data and apply additional filters
    let bookings = (data as unknown as BookingRow[]).map((b) => {
      const pay = (b as any).payment;
      // Collapse array of payments to single most-recent payment
      const single = Array.isArray(pay)
        ? [...(pay as any[])].sort((a, z) => {
            const aTime = new Date(a.created_at ?? 0).getTime();
            const zTime = new Date(z.created_at ?? 0).getTime();
            return zTime - aTime;
          })[0]
        : pay;
      return { ...b, payment: single };
    });

    // Apply search filter (after fetching since it's cross-field)
    if (search) {
      const q = search.toLowerCase();
      bookings = bookings.filter((b) => {
        const name = b.user?.full_name?.toLowerCase() || "";
        const email = b.user?.email?.toLowerCase() || "";
        const phone = b.user?.phone?.toLowerCase() || "";
        const title = (
          b.session?.workshop?.title_ar || b.session?.workshop?.title_en
        )?.toLowerCase() || "";
        return (
          name.includes(q) ||
          email.includes(q) ||
          phone.includes(q) ||
          title.includes(q) ||
          b.id.toLowerCase().includes(q)
        );
      });
    }

    // Apply payment status filter
    if (paymentStatus) {
      bookings = bookings.filter((b) => {
        if (paymentStatus === "pending") {
          return !b.payment || b.payment.status === "pending";
        } else if (paymentStatus === "paid") {
          return b.payment?.status === "paid";
        } else if (paymentStatus === "pending_verification") {
          return b.payment?.status === "pending_verification";
        } else if (paymentStatus === "failed") {
          return b.payment?.status === "failed";
        }
        return true;
      });
    }

    // Apply receipt status filter
    if (receiptStatus) {
      bookings = bookings.filter((b) => {
        if (receiptStatus === "none") {
          return !b.payment?.proof_url;
        } else if (receiptStatus === "pending_verification") {
          return (
            b.payment?.proof_url && b.payment?.status === "pending_verification"
          );
        } else if (receiptStatus === "verified") {
          return (
            b.payment?.proof_url &&
            (b.payment?.status === "paid" || b.payment?.admin_approved)
          );
        } else if (receiptStatus === "rejected") {
          return (
            b.payment?.proof_url &&
            b.payment?.status === "failed" &&
            !b.payment?.admin_approved
          );
        }
        return true;
      });
    }

    // Calculate total count after filtering
    const totalFiltered = bookings.length;

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalFiltered,
        pages: Math.ceil(totalFiltered / pageSize),
      },
    });
  } catch (error) {
    console.error("Error fetching admin bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
