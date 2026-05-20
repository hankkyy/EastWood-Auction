ALTER TABLE public.inquiries
ADD COLUMN IF NOT EXISTS is_processed boolean NOT NULL DEFAULT false;
