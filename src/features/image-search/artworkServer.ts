import type { Artwork } from "@/data/artworks";
import { rowToArtwork, type ArtworkRow } from "@/features/image-search/artworkCloud";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { seedArtworks } from "@/data/seedArtworks";

const TABLE_NAME = "artworks";

const toSerializable = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export const fetchKnowledgeBaseServer = async (): Promise<Artwork[]> => {
  try {
    const supabase = getSupabaseAdmin();

    const { data: artworksData, error: artworksError } = await supabase
      .from(TABLE_NAME)
      .select("*")
      .order("updated_at", { ascending: false });

    if (artworksError) throw artworksError;

    const uploaderIds = Array.from(
      new Set(
        ((artworksData ?? []) as any[])
          .map((row) => row.uploaded_by)
          .filter(Boolean)
      )
    );

    let uploaderMap: Record<string, string> = {};
    if (uploaderIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id")
        .in("id", uploaderIds);

      if (profilesError) throw profilesError;

      uploaderMap = (profilesData ?? []).reduce((acc: Record<string, string>, profile: any) => {
        acc[profile.id] = profile.user_id;
        return acc;
      }, {});
    }

    const artworks = ((artworksData ?? []) as ArtworkRow[]).map((row) => {
      const artwork = rowToArtwork(row);
      if ((row as any).uploaded_by && uploaderMap[(row as any).uploaded_by]) {
        artwork.uploaderName = uploaderMap[(row as any).uploaded_by];
      }
      return artwork;
    });

    const result = toSerializable(artworks);
    // 如果 Supabase 返回空数据，回退到本地种子数据
    if (result.length === 0) {
      console.log("[artworkServer] Supabase returned 0 artworks, using seed data");
      return seedArtworks;
    }
    return result;
  } catch (error) {
    console.warn("[artworkServer] Supabase fetch failed, using seed data:", (error as Error).message);
    return seedArtworks;
  }
};
