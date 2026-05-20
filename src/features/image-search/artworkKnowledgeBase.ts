import type { Artwork } from "@/data/artworks";
import {
  isSupabaseConfigured,
  normalizeArtwork,
} from "@/features/image-search/artworkCloud";
import { supabase } from "@/lib/supabase/client";

let cloudKnowledgeBaseCache: Artwork[] | null = null;

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
    const payload = (await response.json()) as {
      artworks?: Artwork[];
      error?: string;
    };

    if (!response.ok) {
      throw new Error(payload.error || "Unable to load artworks.");
    }

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

  const payload = (await response.json()) as {
    artwork?: Artwork;
    error?: string;
  };

  if (!response.ok || !payload.artwork) {
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

  const payload = (await response.json()) as {
    artwork?: Artwork;
    error?: string;
  };

  if (!response.ok || !payload.artwork) {
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

  const payload = (await response.json()) as { ok?: boolean; error?: string };

  if (!response.ok || !payload.ok) {
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
