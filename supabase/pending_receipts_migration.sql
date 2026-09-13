-- Create pending_receipts table for tracking receipt uploads
CREATE TABLE IF NOT EXISTS pending_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  workshop_title TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  receipt_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_pending_receipts_status ON pending_receipts(status);
CREATE INDEX IF NOT EXISTS idx_pending_receipts_user_id ON pending_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_receipts_uploaded_at ON pending_receipts(uploaded_at DESC);

-- Enable RLS
ALTER TABLE pending_receipts ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own receipts
CREATE POLICY "Users can view their own receipts" ON pending_receipts
  FOR SELECT USING (auth.uid() = user_id);

-- Allow admins to view all receipts
CREATE POLICY "Admins can view all receipts" ON pending_receipts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Allow users to insert their own receipts
CREATE POLICY "Users can insert their own receipts" ON pending_receipts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to update receipts
CREATE POLICY "Admins can update receipts" ON pending_receipts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
    )
  );

-- Create storage bucket for receipts if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload receipts
CREATE POLICY "Users can upload receipts" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'receipts' AND auth.role() = 'authenticated'
  );

-- Allow users to view their own receipts
CREATE POLICY "Users can view their own receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND (auth.uid()::text = owner OR auth.role() = 'authenticated')
  );

-- Allow admins to view all receipts
CREATE POLICY "Admins can view all receipts" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'receipts' AND (
      auth.role() = 'authenticated'
      OR EXISTS (
        SELECT 1 FROM user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role = 'admin'
      )
    )
  );
