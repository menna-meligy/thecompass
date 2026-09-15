-- ============================================================================
-- Keep every receipt a client uploads, including the ones the automatic
-- checks reject.
-- ----------------------------------------------------------------------------
-- The OCR check is a convenience, not an authority — it is done in the client's
-- browser on a photo of a phone screen, and it demonstrably misreads real
-- digits (a clean "500" has been read as "900"). Discarding the upload when it
-- fails meant an honest client with an unreadable receipt hit a dead end and
-- the coach never learned they had tried at all.
--
-- Every attempt is now stored with the reasons it failed, so the coach can look
-- at the image and decide for herself.
--
-- Safe to re-run (idempotent).
-- ============================================================================

-- Why the automatic checks rejected it, e.g. ["amount_mismatch"].
alter table public.payments
  add column if not exists receipt_validation_errors jsonb;

-- What the OCR actually read, so the coach can compare it against the image
-- rather than taking the machine's word for it.
alter table public.payments
  add column if not exists receipt_ocr_amount numeric;
alter table public.payments
  add column if not exists receipt_ocr_reference text;

-- How many times this client has tried, and when they last did.
alter table public.payments
  add column if not exists receipt_attempts integer not null default 0;
alter table public.payments
  add column if not exists receipt_last_attempt_at timestamptz;

-- receipt_validation_status vocabulary:
--   'auto_verified'  → the automatic checks passed; waiting on the coach
--   'needs_review'   → the automatic checks failed; waiting on the coach
--   'approved'       → the coach confirmed it
--   'rejected'       → the coach refused it
update public.payments
   set receipt_validation_status = 'auto_verified'
 where proof_url is not null
   and receipt_validation_status = 'pending_manual_review';

update public.payments
   set receipt_validation_status = 'approved'
 where receipt_validation_status is distinct from 'approved'
   and (status = 'paid' or admin_approved = true);

-- Existing receipts predate the attempt counter but each represents one upload.
update public.payments
   set receipt_attempts = 1,
       receipt_last_attempt_at = coalesce(receipt_last_attempt_at, receipt_validated_at, created_at)
 where proof_url is not null
   and receipt_attempts = 0;

create index if not exists idx_payments_receipt_review
  on public.payments (receipt_validation_status)
  where proof_url is not null;
