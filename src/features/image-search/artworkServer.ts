import type { Artwork } from "@/data/artworks";
import { rowToArtwork, type ArtworkRow } from "@/features/image-search/artworkCloud";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const TABLE_NAME = "artworks";

const toSerializable = <T>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export const fetchKnowledgeBaseServer = async (): Promise<Artwork[]> => {
  const supabase = getSupabaseAdmin();

  const { data: artworksData, error: artworksError } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .order("updated_at", { ascending: false });

  if (artworksError) {
    throw artworksError;
  }

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

    if (profilesError) {
      throw profilesError;
    }

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

  return toSerializable(artworks);
};
