-- ============================================
-- 委托与咨询表
-- ============================================

CREATE TABLE IF NOT EXISTS public.inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  inquiry_code text,
  no_inquiry_code boolean NOT NULL DEFAULT false,
  is_processed boolean NOT NULL DEFAULT false,
  details text NOT NULL,
  contact_phone text NOT NULL,
  contact_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT inquiries_code_required_check
    CHECK (no_inquiry_code = true OR inquiry_code IS NOT NULL)
);

ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all inquiries" ON public.inquiries;
CREATE POLICY "Admins can view all inquiries"
ON public.inquiries
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Users can insert own inquiries" ON public.inquiries;
CREATE POLICY "Users can insert own inquiries"
ON public.inquiries
FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own inquiries" ON public.inquiries;
CREATE POLICY "Users can view own inquiries"
ON public.inquiries
FOR SELECT
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.set_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inquiries_set_updated_at ON public.inquiries;
CREATE TRIGGER inquiries_set_updated_at
BEFORE UPDATE ON public.inquiries
FOR EACH ROW
EXECUTE FUNCTION public.set_inquiries_updated_at();
