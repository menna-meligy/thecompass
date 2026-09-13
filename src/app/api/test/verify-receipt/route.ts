import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { validateReceipt } from "@/lib/payments/receipt";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const bookingId = (form.get("booking_id") as string) || null;
    const ocrAmount = form.get("ocr_amount") ? Number(form.get("ocr_amount")) : null;
    const ocrDate = (form.get("ocr_date") as string) || null;
    const ocrReference = ((form.get("ocr_reference") as string) || "").replace(/\D/g, "") || null;

    if (!file || !file.type.startsWith("image/")) {
      return NextResponse.json({ verified: false, error: "no_image", details: "File is not an image" });
    }
    if (file.size < 5 * 1024) {
      return NextResponse.json({ verified: false, error: "file_too_small", details: `File too small: ${file.size} bytes` });
    }
    if (!bookingId) {
      return NextResponse.json({ verified: false, error: "no_booking_id", details: "Booking ID required" });
    }

    const admin = await createAdminClient();

    // Get booking
    const { data: booking, error: bookingError } = await admin
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ verified: false, error: "booking_not_found", details: String(bookingError) });
    }

    // Get payment separately
    const { data: payments } = await admin
      .from("payments")
      .select("*")
      .eq("booking_id", bookingId);

    const payment = payments?.[0];
    if (!payment) {
      return NextResponse.json({ verified: false, error: "no_payment", details: "No payment record found" });
    }

    const expectedAmount = Number(payment.amount);

    // Validate receipt
    const parsed = {
      amount: ocrAmount,
      date: ocrDate ? new Date(ocrDate) : null,
      reference: ocrReference,
    };

    const errors = validateReceipt(parsed, { expectedAmount, now: new Date(), maxAgeDays: 0 });

    if (errors.length > 0) {
      return NextResponse.json({ verified: false, error: errors[0], errors });
    }

    // SUCCESS
    return NextResponse.json({ verified: true, reference: parsed.reference });
  } catch (err) {
    return NextResponse.json({ verified: false, error: "error", details: String(err) }, { status: 500 });
  }
}
