import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type ReplyPayload = {
  inquiryId?: string;
  body?: string;
};

type MarkReadPayload = {
  inquiryIds?: string[];
};

const TABLE_NAME = "inquiry_messages";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const supabase = getSupabaseAdmin();

  if (req.method === "POST") {
    const { inquiryId, body } = req.body as ReplyPayload;
    const trimmedBody = body?.trim() ?? "";

    if (!inquiryId || !trimmedBody) {
      return res.status(400).json({ error: "Inquiry id and reply body are required." });
    }

    const { data: inquiry, error: inquiryError } = await supabase
      .from("inquiries")
      .select("id, user_id")
      .eq("id", inquiryId)
      .maybeSingle();

    if (inquiryError) {
      return res.status(500).json({ error: inquiryError.message });
    }

    if (!inquiry) {
      return res.status(404).json({ error: "Inquiry not found." });
    }

    if (!auth.isAdmin && inquiry.user_id !== auth.userId) {
      return res.status(403).json({ error: "You can only reply to your own inquiries." });
    }

    const senderRole = auth.isAdmin ? "admin" : "user";
    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        inquiry_id: inquiryId,
        sender_user_id: auth.userId,
        sender_role: senderRole,
        body: trimmedBody,
        is_read: false,
      } as any)
      .select("id, inquiry_id, sender_user_id, sender_role, body, is_read, created_at")
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || "Unable to send reply." });
    }

    await supabase
      .from("inquiries")
      .update({ is_processed: auth.isAdmin } as any)
      .eq("id", inquiryId);

    return res.status(201).json({ message: data });
  }

  if (req.method === "PATCH") {
    const { inquiryIds } = req.body as MarkReadPayload;
    if (!Array.isArray(inquiryIds) || inquiryIds.length === 0) {
      return res.status(400).json({ error: "At least one inquiry id is required." });
    }

    const { data: inquiries, error: inquiryError } = await supabase
      .from("inquiries")
      .select("id, user_id")
      .in("id", inquiryIds);

    if (inquiryError) {
      return res.status(500).json({ error: inquiryError.message });
    }

    if (!auth.isAdmin) {
      const unauthorized = (inquiries ?? []).some((item: any) => item.user_id !== auth.userId);
      if (unauthorized) {
        return res.status(403).json({ error: "You can only access your own inquiries." });
      }
    }

    const incomingRole = auth.isAdmin ? "user" : "admin";
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ is_read: true } as any)
      .in("inquiry_id", inquiryIds)
      .eq("sender_role", incomingRole)
      .eq("is_read", false);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["POST", "PATCH"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
