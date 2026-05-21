-- ============================================
-- 委托与咨询消息表
-- 用于管理员和个人用户在同一条咨询下双向回复
-- ============================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.inquiry_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid NOT NULL REFERENCES public.inquiries(id) ON DELETE CASCADE,
  sender_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_role text NOT NULL CHECK (sender_role IN ('admin', 'user')),
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inquiry_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view all inquiry messages" ON public.inquiry_messages;
CREATE POLICY "Admins can view all inquiry messages"
ON public.inquiry_messages
FOR SELECT
USING (public.is_admin());

DROP POLICY IF EXISTS "Users can view own inquiry messages" ON public.inquiry_messages;
CREATE POLICY "Users can view own inquiry messages"
ON public.inquiry_messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.inquiries
    WHERE inquiries.id = inquiry_messages.inquiry_id
      AND inquiries.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can insert inquiry messages" ON public.inquiry_messages;
CREATE POLICY "Admins can insert inquiry messages"
ON public.inquiry_messages
FOR INSERT
WITH CHECK (
  public.is_admin()
  AND sender_user_id = auth.uid()
  AND sender_role = 'admin'
);

DROP POLICY IF EXISTS "Users can insert own inquiry messages" ON public.inquiry_messages;
CREATE POLICY "Users can insert own inquiry messages"
ON public.inquiry_messages
FOR INSERT
WITH CHECK (
  sender_user_id = auth.uid()
  AND sender_role = 'user'
  AND EXISTS (
    SELECT 1
    FROM public.inquiries
    WHERE inquiries.id = inquiry_messages.inquiry_id
      AND inquiries.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Admins can update inquiry messages" ON public.inquiry_messages;
CREATE POLICY "Admins can update inquiry messages"
ON public.inquiry_messages
FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can mark own inquiry messages as read" ON public.inquiry_messages;
CREATE POLICY "Users can mark own inquiry messages as read"
ON public.inquiry_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.inquiries
    WHERE inquiries.id = inquiry_messages.inquiry_id
      AND inquiries.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.inquiries
    WHERE inquiries.id = inquiry_messages.inquiry_id
      AND inquiries.user_id = auth.uid()
  )
);

COMMIT;
