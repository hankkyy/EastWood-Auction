import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type InquiryRow = {
  id: string;
  user_id: string;
  inquiry_code: string | null;
  no_inquiry_code: boolean;
  is_processed: boolean;
  details: string;
  contact_phone: string;
  contact_email: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    user_id: string | null;
    email: string | null;
  } | null;
};

type InquiryMessageRow = {
  id: string;
  inquiry_id: string;
  sender_user_id: string;
  sender_role: "admin" | "user";
  body: string;
  is_read: boolean;
  created_at: string;
};

const TABLE_NAME = "inquiries";

type InquiryPayload = {
  inquiryCode?: string;
  noInquiryCode?: boolean;
  details?: string;
  contactPhone?: string;
  contactEmail?: string;
};

type InquiryStatusPayload = {
  id?: string;
  isProcessed?: boolean;
};

const toSerializable = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const normalizePayload = (body: InquiryPayload) => {
  const inquiryCode = body.inquiryCode?.trim() ?? "";
  const details = body.details?.trim() ?? "";
  const contactPhone = body.contactPhone?.trim() ?? "";
  const contactEmail = body.contactEmail?.trim() ?? "";
  const noInquiryCode = Boolean(body.noInquiryCode);

  if (!noInquiryCode && !inquiryCode) {
    return { ok: false as const, status: 400, error: "Inquiry code is required unless marked as none." };
  }

  if (!details) {
    return { ok: false as const, status: 400, error: "Inquiry details are required." };
  }

  if (!contactPhone) {
    return { ok: false as const, status: 400, error: "Contact phone is required." };
  }

  if (!contactEmail) {
    return { ok: false as const, status: 400, error: "Contact email is required." };
  }

  return {
    ok: true as const,
    inquiryCode: noInquiryCode ? null : inquiryCode,
    noInquiryCode,
    details,
    contactPhone,
    contactEmail,
  };
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const supabase = getSupabaseAdmin();

  if (req.method === "POST") {
    const normalized = normalizePayload(req.body as InquiryPayload);
    if (!normalized.ok) {
      return res.status(normalized.status).json({ error: normalized.error });
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .insert({
        user_id: auth.userId,
        inquiry_code: normalized.inquiryCode,
        no_inquiry_code: normalized.noInquiryCode,
        details: normalized.details,
        contact_phone: normalized.contactPhone,
        contact_email: normalized.contactEmail,
      } as any)
      .select("*")
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || "Unable to submit inquiry." });
    }

    const { error: messageError } = await supabase.from("inquiry_messages").insert({
      inquiry_id: data.id,
      sender_user_id: auth.userId,
      sender_role: "user",
      body: normalized.details,
      is_read: false,
    } as any);

    if (messageError) {
      return res.status(500).json({ error: messageError.message || "Unable to create inquiry thread." });
    }

    return res.status(201).json({ inquiry: toSerializable(data as InquiryRow) });
  }

  if (req.method === "GET") {
    const countOnly = req.query.countOnly === "1";
    const selectFields = countOnly
      ? "id, user_id, is_processed"
      : auth.isAdmin
        ? "id, user_id, inquiry_code, no_inquiry_code, is_processed, details, contact_phone, contact_email, created_at, updated_at, profiles:user_id (id, first_name, last_name, user_id, email)"
        : "id, user_id, inquiry_code, no_inquiry_code, is_processed, details, contact_phone, contact_email, created_at, updated_at";

    let query = supabase.from(TABLE_NAME).select(selectFields);

    if (!auth.isAdmin) {
      query = query.eq("user_id", auth.userId);
    }

    if (!countOnly) {
      query = query.order("created_at", { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const inquiries = toSerializable((data ?? []) as unknown as InquiryRow[]);
    const inquiryIds = inquiries.map((item) => item.id);
    const pendingCount = inquiries.filter((item: any) => !item.is_processed).length;
    const totalCount = inquiries.length;
    let unreadCount = 0;

    if (inquiryIds.length) {
      const unreadSenderRole: InquiryMessageRow["sender_role"] = auth.isAdmin ? "user" : "admin";
      const { data: unreadMessages, error: unreadError } = await supabase
        .from("inquiry_messages")
        .select("id, inquiry_id, sender_user_id, sender_role, body, is_read, created_at")
        .in("inquiry_id", inquiryIds)
        .eq("sender_role", unreadSenderRole)
        .eq("is_read", false);

      if (unreadError) {
        return res.status(500).json({ error: unreadError.message });
      }

      unreadCount = (unreadMessages ?? []).length;
    }

    if (countOnly) {
      return res.status(200).json({ pendingCount, totalCount, unreadCount });
    }

    let messagesByInquiryId: Record<string, InquiryMessageRow[]> = {};

    if (inquiryIds.length) {
      const { data: messages, error: messagesError } = await supabase
        .from("inquiry_messages")
        .select("id, inquiry_id, sender_user_id, sender_role, body, is_read, created_at")
        .in("inquiry_id", inquiryIds)
        .order("created_at", { ascending: true });

      if (messagesError) {
        return res.status(500).json({ error: messagesError.message });
      }

      messagesByInquiryId = (messages ?? []).reduce<Record<string, InquiryMessageRow[]>>((acc, item) => {
        const message = item as InquiryMessageRow;
        if (!acc[message.inquiry_id]) {
          acc[message.inquiry_id] = [];
        }
        acc[message.inquiry_id].push(message);
        return acc;
      }, {});
    }

    const enrichedInquiries = inquiries.map((inquiry) => {
      const messages = messagesByInquiryId[inquiry.id] ?? [];
      const hasOpeningMessage = messages.some(
        (message) => message.sender_role === "user" && message.body === inquiry.details
      );
      const threadMessages = hasOpeningMessage
        ? messages
        : [
            {
              id: `initial-${inquiry.id}`,
              inquiry_id: inquiry.id,
              sender_user_id: inquiry.user_id,
              sender_role: "user" as const,
              body: inquiry.details,
              is_read: auth.isAdmin,
              created_at: inquiry.created_at,
            },
            ...messages,
          ];

      return {
        ...inquiry,
        messages: threadMessages,
      };
    });

    return res.status(200).json({ inquiries: enrichedInquiries, pendingCount, totalCount, unreadCount });
  }

  if (req.method === "PATCH") {
    if (!auth.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id, isProcessed } = req.body as InquiryStatusPayload;
    if (!id || typeof isProcessed !== "boolean") {
      return res.status(400).json({ error: "Inquiry id and processed status are required." });
    }

    const { data, error } = await supabase
      .from(TABLE_NAME)
      .update({ is_processed: isProcessed } as any)
      .eq("id", id)
      .select(
        "id, user_id, inquiry_code, no_inquiry_code, is_processed, details, contact_phone, contact_email, created_at, updated_at, profiles:user_id (id, first_name, last_name, user_id, email)"
      )
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message || "Unable to update inquiry status." });
    }

    return res.status(200).json({ inquiry: toSerializable(data) });
  }

  res.setHeader("Allow", ["GET", "POST", "PATCH"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
