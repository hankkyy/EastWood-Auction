import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const supabase = getSupabaseAdmin();

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("favorite_artworks")
      .select("artwork_id, created_at")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ favorites: data ?? [] });
  }

  if (req.method === "POST") {
    const artworkId = (req.body?.artworkId as string | undefined)?.trim();
    if (!artworkId) {
      return res.status(400).json({ error: "artworkId is required." });
    }

    const { error } = await supabase.from("favorite_artworks").upsert(
      { user_id: auth.userId, artwork_id: artworkId } as any,
      { onConflict: "user_id,artwork_id" }
    );

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
