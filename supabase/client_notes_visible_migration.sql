-- Client session notes are written for the mentor to read: the dashboard no
-- longer offers a private note, so a row should never default to hidden.
-- Existing rows are all visible already (the table was empty when the private
-- box was removed), but set them explicitly so the flag tells the truth.
ALTER TABLE public.client_notes ALTER COLUMN is_public SET DEFAULT true;
UPDATE public.client_notes SET is_public = true WHERE is_public IS DISTINCT FROM true;
