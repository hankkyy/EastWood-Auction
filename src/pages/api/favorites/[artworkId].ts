import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const artworkId = typeof req.query.artworkId === "string" ? req.query.artworkId.trim() : "";
  if (!artworkId) {
    return res.status(400).json({ error: "artworkId is required." });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("favorite_artworks")
    .delete()
    .eq("user_id", auth.userId)
    .eq("artwork_id", artworkId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
