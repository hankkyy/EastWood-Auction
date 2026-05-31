import type { Artwork } from "@/data/artworks";
import {
  isSupabaseConfigured,
  normalizeArtwork,
} from "@/features/image-search/artworkCloud";
import { supabase } from "@/lib/supabase/client";

let cloudKnowledgeBaseCache: Artwork[] | null = null;

type ApiPayload = Record<string, unknown> & { error?: string };

const parseApiResponse = async <T extends ApiPayload>(
  response: Response,
  fallbackMessage: string
): Promise<T> => {
  const rawText = await response.text();
  let payload: T = {} as T;

  if (rawText) {
    try {
      payload = JSON.parse(rawText) as T;
    } catch {
      if (!response.ok) {
        const isPayloadTooLarge =
          response.status === 413 ||
          rawText.toLowerCase().includes("request entity too large");
        const message = isPayloadTooLarge
          ? "保存失败：图片数据过大，请减少图片数量或压缩后重试。"
          : `请求失败（${response.status}）：${rawText.slice(0, 160)}`;
        throw new Error(message);
      }
      throw new Error(fallbackMessage);
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || fallbackMessage);
  }

  return payload;
};

export const getKnowledgeBase = (): Artwork[] => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is required for persistent artwork storage.");
  }

  return cloudKnowledgeBaseCache ?? [];
};

export const getImportedArtworks = (): Artwork[] => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is required for persistent artwork storage.");
  }

  return (cloudKnowledgeBaseCache ?? []).filter((artwork) =>
    artwork.id.startsWith("imported-")
  );
};

export const fetchKnowledgeBase = async (): Promise<Artwork[]> => {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is required for persistent artwork storage.");
  }

  if (typeof window === "undefined") {
    return [];
  }

  try {
    const response = await fetch("/api/artworks");
    const payload = await parseApiResponse<{
      artworks?: Artwork[];
      error?: string;
    }>(response, "Unable to load artworks.");

    const nextArtworks = (payload.artworks ?? []).map(normalizeArtwork);
    cloudKnowledgeBaseCache = nextArtworks;
    return nextArtworks;
  } catch (error) {
    console.error("Unable to load cloud artworks:", error);
    return cloudKnowledgeBaseCache ?? [];
  }
};

export const fetchImportedArtworks = async (): Promise<Artwork[]> => {
  const allArtworks = await fetchKnowledgeBase();

  return allArtworks.filter((artwork) => artwork.id.startsWith("imported-"));
};

export const saveImportedArtwork = async (artwork: Artwork) => {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    throw new Error("Supabase is required for persistent artwork storage.");
  }

  // ✅ 获取当前用户的认证 token
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("请先登录");
  }

  const response = await fetch("/api/artworks", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`, // ✅ 携带认证 token
    },
    body: JSON.stringify({ artwork: normalizeArtwork(artwork) }),
  });

  const payload = await parseApiResponse<{
    artwork?: Artwork;
    error?: string;
  }>(response, "Unable to save artwork.");

  if (!payload.artwork) {
    throw new Error(payload.error || "Unable to save artwork.");
  }

  const savedArtwork = normalizeArtwork(payload.artwork);
  cloudKnowledgeBaseCache = [
    savedArtwork,
    ...(cloudKnowledgeBaseCache ?? []).filter((item) => item.id !== savedArtwork.id),
  ];
  return savedArtwork;
};

export const updateImportedArtwork = async (artwork: Artwork) => {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    throw new Error("Supabase is required for persistent artwork storage.");
  }

  // ✅ 获取当前用户的认证 token
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("请先登录");
  }

  const response = await fetch(`/api/artworks/${artwork.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${session.access_token}`, // ✅ 携带认证 token
    },
    body: JSON.stringify({ artwork: normalizeArtwork(artwork) }),
  });

  const payload = await parseApiResponse<{
    artwork?: Artwork;
    error?: string;
  }>(response, "Unable to update artwork.");

  if (!payload.artwork) {
    throw new Error(payload.error || "Unable to update artwork.");
  }

  const updatedArtwork = normalizeArtwork(payload.artwork);
  cloudKnowledgeBaseCache = (cloudKnowledgeBaseCache ?? []).map((item) =>
    item.id === updatedArtwork.id ? updatedArtwork : item
  );
  return updatedArtwork;
};

export const deleteImportedArtwork = async (artworkId: string) => {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    throw new Error("Supabase is required for persistent artwork storage.");
  }

  // ✅ 获取当前用户的认证 token
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session?.access_token) {
    throw new Error("请先登录");
  }

  const response = await fetch(`/api/artworks/${artworkId}`, {
    method: "DELETE",
    headers: {
      "Authorization": `Bearer ${session.access_token}`, // ✅ 携带认证 token
    },
  });

  const payload = await parseApiResponse<{ ok?: boolean; error?: string }>(
    response,
    "Unable to delete artwork."
  );

  if (!payload.ok) {
    throw new Error(payload.error || "Unable to delete artwork.");
  }

  cloudKnowledgeBaseCache = (cloudKnowledgeBaseCache ?? []).filter(
    (item) => item.id !== artworkId
  );
};

export const rehydrateImportedArtworkSignatures = async () => {
  return false;
};

export const clearImportedArtworks = () => {
  cloudKnowledgeBaseCache = null;
};
