import type { NextApiRequest, NextApiResponse } from "next";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { verifySupabaseUser } from "@/lib/supabase/auth";

/**
 * POST /api/external/saved  — save or unsave a listing
 * GET  /api/external/saved  — list saved listing IDs for current user
 *
 * POST body: { listing_id: string, action: "save" | "unsave" }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Auth required for all operations
  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const supabase = getSupabaseAdmin();
  const userId = auth.userId;

  if (req.method === "GET") {
    // Return saved listing IDs for current user
    const { data, error } = await supabase
      .from("saved_listings")
      .select("listing_id")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    return res.status(200).json({
      saved_ids: (data || []).map((r) => r.listing_id),
    });
  }

  if (req.method === "POST") {
    const { listing_id, action } = req.body || {};

    if (!listing_id || typeof listing_id !== "string") {
      return res.status(400).json({ error: "listing_id is required" });
    }

    if (action === "save") {
      const { error } = await supabase
        .from("saved_listings")
        .upsert(
          { user_id: userId, listing_id },
          { onConflict: "user_id,listing_id" }
        );

      if (error) {
        // Unique violation = already saved, that's fine
        if (error.code === "23505") {
          return res.status(200).json({ saved: true });
        }
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ saved: true });
    }

    if (action === "unsave") {
      const { error } = await supabase
        .from("saved_listings")
        .delete()
        .eq("user_id", userId)
        .eq("listing_id", listing_id);

      if (error) return res.status(500).json({ error: error.message });

      return res.status(200).json({ saved: false });
    }

    return res.status(400).json({ error: "action must be 'save' or 'unsave'" });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: "Method Not Allowed" });
}
