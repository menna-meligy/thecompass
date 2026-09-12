-- ============================================================
-- MANUAL PAYMENT APPROVAL MIGRATION
-- Adds admin manual approval capability for session payments
-- ============================================================

-- Add admin_approved and admin_approval_notes columns to payments table
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS admin_approval_notes_ar TEXT,
ADD COLUMN IF NOT EXISTS admin_approval_notes_en TEXT,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Create index for admin approval queries
CREATE INDEX IF NOT EXISTS idx_payments_admin_approved ON public.payments (admin_approved);
CREATE INDEX IF NOT EXISTS idx_payments_approved_by ON public.payments (approved_by);
CREATE INDEX IF NOT EXISTS idx_payments_approved_at ON public.payments (approved_at DESC);

-- Update RLS policies to allow admins to update admin_approved field
DROP POLICY IF EXISTS "Admins can update any payment" ON public.payments;

CREATE POLICY "Admins can update any payment" ON public.payments
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
