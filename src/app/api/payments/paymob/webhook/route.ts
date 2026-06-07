import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();

  const hmacSecret = process.env.PAYMOB_HMAC_SECRET;
  if (!hmacSecret) {
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  // Verify HMAC
  const hmacFields = [
    body.obj?.amount_cents,
    body.obj?.created_at,
    body.obj?.currency,
    body.obj?.error_occured,
    body.obj?.has_parent_transaction,
    body.obj?.id,
    body.obj?.integration_id,
    body.obj?.is_3d_secure,
    body.obj?.is_auth,
    body.obj?.is_capture,
    body.obj?.is_refunded,
    body.obj?.is_standalone_payment,
    body.obj?.is_voided,
    body.obj?.order?.id,
    body.obj?.owner,
    body.obj?.pending,
    body.obj?.source_data?.pan,
    body.obj?.source_data?.sub_type,
    body.obj?.source_data?.type,
    body.obj?.success,
  ]
    .map(String)
    .join("");

  const expectedHmac = createHmac("sha512", hmacSecret)
    .update(hmacFields)
    .digest("hex");

  const receivedHmac = request.nextUrl.searchParams.get("hmac");

  if (receivedHmac !== expectedHmac) {
    return NextResponse.json({ error: "Invalid HMAC" }, { status: 401 });
  }

  if (body.type === "TRANSACTION" && body.obj?.success) {
    const orderId = body.obj.order?.id?.toString();
    if (!orderId) {
      return NextResponse.json({ ok: true });
    }

    const supabase = await createAdminClient();

    // Find payment by gateway_txn_id
    const { data: payment } = await supabase
      .from("payments")
      .select("*, booking:bookings(*)")
      .eq("gateway_txn_id", orderId)
      .single();

    if (payment) {
      await supabase
        .from("payments")
        .update({ status: "paid" })
        .eq("id", payment.id);

      await supabase
        .from("bookings")
        .update({ status: "confirmed" })
        .eq("id", payment.booking_id);
    }
  }

  return NextResponse.json({ ok: true });
}
