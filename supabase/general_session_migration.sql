-- Run this in Supabase Dashboard > SQL Editor
-- Allows general coaching bookings (no specific session/workshop)

ALTER TABLE public.bookings ALTER COLUMN session_id DROP NOT NULL;

-- Create payment-proofs storage bucket (public read for receipt display)
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-proofs', 'payment-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload proofs
CREATE POLICY "Authenticated can upload proofs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs');

-- Allow public read of proofs
CREATE POLICY "Public can read proofs"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'payment-proofs');
