-- Add missing columns to payments table for admin approval workflow
ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS admin_approved BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS admin_approval_notes_ar TEXT,
ADD COLUMN IF NOT EXISTS admin_approval_notes_en TEXT;
