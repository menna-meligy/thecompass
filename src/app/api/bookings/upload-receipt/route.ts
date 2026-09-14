import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { parseReceipt, validateReceipt } from '@/lib/payments/receipt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const paymentId = formData.get('paymentId') as string;
    const userId = formData.get('userId') as string;

    if (!file || !paymentId || !userId) {
      return NextResponse.json(
        { error: 'Missing file, paymentId, or userId' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'File must be an image' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'File size must be less than 5MB' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRole);

    // Check if payment exists and belongs to user
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('user_id', userId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    // Upload file to Supabase Storage
    const fileName = `${paymentId}-${Date.now()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('proofs')
      .upload(`${userId}/${fileName}`, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 400 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('proofs')
      .getPublicUrl(`${userId}/${fileName}`);

    // Update payment with receipt URL and set status to pending_verification
    const { data: updatedPayment, error: updateError } = await supabase
      .from('payments')
      .update({
        proof_url: urlData.publicUrl,
        status: 'pending_verification',
      })
      .eq('id', paymentId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 400 }
      );
    }

    // Get booking and session info for validation
    const { data: booking } = await supabase
      .from('bookings')
      .select('id, session_id')
      .eq('id', payment.booking_id)
      .single();

    if (booking) {
      const { data: session } = await supabase
        .from('sessions')
        .select('price')
        .eq('id', booking.session_id)
        .single();

      if (session) {
        // Record validation metadata for admin review
        await supabase
          .from('payments')
          .update({
            receipt_validated_at: new Date().toISOString(),
            receipt_validation_status: 'pending_manual_review',
          })
          .eq('id', paymentId);
      }
    }

    return NextResponse.json({
      success: true,
      payment: updatedPayment,
      receiptUrl: urlData.publicUrl,
    });
  } catch (error) {
    console.error('Receipt upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload receipt' },
      { status: 500 }
    );
  }
}
