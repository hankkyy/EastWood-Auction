// POST /api/seed — 批量导入种子数据到 Supabase
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { artworkToRow } from "@/features/image-search/artworkCloud";
import { seedArtworks } from "@/data/seedArtworks";
import { verifySupabaseUser } from "@/lib/supabase/auth";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status((auth as any).status || 401).json({ error: (auth as any).error || "Authentication required" });
  }
  if (!auth.isAdmin) {
    return res.status(403).json({ error: "Admin required" });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const results: string[] = [];
  let inserted = 0;

  for (const item of seedArtworks) {
    const { data: existing } = await supabase.from("artworks").select("id").eq("id", item.id).maybeSingle();
    if (existing) {
      results.push(`⏭️ ${item.titleZh} (已存在)`);
      continue;
    }

    const row = artworkToRow(item as any);
    const { error } = await supabase.from("artworks").insert(row as any);
    if (error) {
      results.push(`❌ ${item.titleZh}: ${error.message}`);
    } else {
      inserted++;
      const tag = item.isForSale ? "🏪" : "📚";
      results.push(`✅ ${tag} ${item.titleZh}`);
    }
  }

  results.push(`\n🎉 完成！${inserted}/${seedArtworks.length} 条已导入`);
  return res.status(200).json({ results });
}
