import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { session_id, time_slot_id, payment_method, amount, discount_code } = body;

  if (!session_id || !payment_method || !amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify session exists and is published
  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", session_id)
    .eq("status", "published")
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found or not available" }, { status: 404 });
  }

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      user_id: user.id,
      session_id,
      time_slot_id: time_slot_id || null,
      status: "pending",
    })
    .select()
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: bookingError?.message || "Failed to create booking" }, { status: 500 });
  }

  // Increment time slot booked count
  if (time_slot_id) {
    const { data: slot } = await supabase
      .from("time_slots")
      .select("booked_count")
      .eq("id", time_slot_id)
      .single();
    if (slot) {
      await supabase
        .from("time_slots")
        .update({ booked_count: (slot.booked_count ?? 0) + 1 })
        .eq("id", time_slot_id);
    }
  }

  // Create payment record
  const { data: payment, error: paymentError } = await supabase
    .from("payments")
    .insert({
      booking_id: booking.id,
      user_id: user.id,
      amount,
      currency: "EGP",
      method: payment_method,
      status: "pending",
    })
    .select()
    .single();

  if (paymentError) {
    return NextResponse.json({ error: paymentError.message }, { status: 500 });
  }

  // For Paymob, create order and return redirect URL
  if (payment_method === "paymob") {
    const paymobRes = await createPaymobOrder({
      amount,
      booking_id: booking.id,
      user_id: user.id,
    });

    if (paymobRes.payment_url) {
      // Update payment with gateway transaction id
      await supabase
        .from("payments")
        .update({ gateway_txn_id: paymobRes.order_id?.toString() })
        .eq("id", payment.id);

      return NextResponse.json({
        booking_id: booking.id,
        payment_url: paymobRes.payment_url,
      });
    }
  }

  // For manual payments, return booking_id
  return NextResponse.json({ booking_id: booking.id });
}

async function createPaymobOrder({
  amount,
  booking_id,
  user_id,
}: {
  amount: number;
  booking_id: string;
  user_id: string;
}) {
  const apiKey = process.env.PAYMOB_API_KEY;
  const integrationId = process.env.PAYMOB_INTEGRATION_ID;
  const iframeId = process.env.PAYMOB_IFRAME_ID;

  if (!apiKey || !integrationId || !iframeId) {
    return {};
  }

  try {
    // Step 1: Auth token
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: apiKey }),
    });
    const authData = await authRes.json();
    const authToken = authData.token;

    // Step 2: Create order
    const orderRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: Math.round(amount * 100),
        currency: "EGP",
        merchant_order_id: booking_id,
        items: [],
      }),
    });
    const orderData = await orderRes.json();

    // Step 3: Payment key
    const keyRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: Math.round(amount * 100),
        expiration: 3600,
        order_id: orderData.id,
        billing_data: {
          apartment: "NA",
          email: "customer@email.com",
          floor: "NA",
          first_name: "Customer",
          street: "NA",
          building: "NA",
          phone_number: "+201000000000",
          shipping_method: "NA",
          postal_code: "NA",
          city: "Cairo",
          country: "EG",
          last_name: "Name",
          state: "NA",
        },
        currency: "EGP",
        integration_id: parseInt(integrationId),
      }),
    });
    const keyData = await keyRes.json();

    return {
      order_id: orderData.id,
      payment_url: `https://accept.paymob.com/api/acceptance/iframes/${iframeId}?payment_token=${keyData.token}`,
    };
  } catch {
    return {};
  }
}
