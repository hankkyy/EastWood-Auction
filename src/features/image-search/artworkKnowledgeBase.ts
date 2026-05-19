import { artworks } from "@/data/artworks";
import type { Artwork } from "@/data/artworks";
import {
  isSupabaseConfigured,
  normalizeArtwork,
} from "@/features/image-search/artworkCloud";
import { extractImageFeatureFromUrl } from "@/features/image-search/imageSearch";
import { supabase } from "@/lib/supabase/client";

const KNOWLEDGE_BASE_KEY = "museum-art-image-knowledge-base";
const KNOWLEDGE_BASE_OVERRIDES_KEY = "museum-art-image-knowledge-base-overrides";
const KNOWLEDGE_BASE_DELETED_KEY = "museum-art-image-knowledge-base-deleted";

let cloudKnowledgeBaseCache: Artwork[] | null = null;

const readImportedArtworks = (): Artwork[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(KNOWLEDGE_BASE_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as Artwork[];
    return Array.isArray(parsed) ? parsed.map(normalizeArtwork) : [];
  } catch {
    return [];
  }
};

const readOverrides = (): Record<string, Artwork> => {
  if (typeof window === "undefined") {
    return {};
  }

  const stored = window.localStorage.getItem(KNOWLEDGE_BASE_OVERRIDES_KEY);

  if (!stored) {
    return {};
  }

  try {
    const parsed = JSON.parse(stored) as Record<string, Artwork>;
    return Object.fromEntries(
      Object.entries(parsed).map(([id, artwork]) => [id, normalizeArtwork(artwork)])
    );
  } catch {
    return {};
  }
};

const readDeletedIds = (): string[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(KNOWLEDGE_BASE_DELETED_KEY);

  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const getLocalKnowledgeBase = (): Artwork[] => {
  const seededArtworks = artworks.map(normalizeArtwork);

  if (typeof window === "undefined") {
    return seededArtworks;
  }

  const imported = readImportedArtworks();
  const overrides = readOverrides();
  const deletedIds = new Set(readDeletedIds());

  const mergedSeeded = seededArtworks
    .filter((artwork) => !deletedIds.has(artwork.id))
    .map((artwork) => overrides[artwork.id] ?? artwork);

  const mergedImported = imported.filter((artwork) => !deletedIds.has(artwork.id));

  return [...mergedSeeded, ...mergedImported];
};

export const getKnowledgeBase = (): Artwork[] => {
  if (isSupabaseConfigured() && cloudKnowledgeBaseCache) {
    return cloudKnowledgeBaseCache;
  }

  return getLocalKnowledgeBase();
};

export const getImportedArtworks = (): Artwork[] => {
  if (isSupabaseConfigured() && cloudKnowledgeBaseCache) {
    return cloudKnowledgeBaseCache.filter((artwork) => artwork.id.startsWith("imported-"));
  }

  return readImportedArtworks();
};

const writeImportedArtworks = (nextArtworks: Artwork[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      KNOWLEDGE_BASE_KEY,
      JSON.stringify(nextArtworks.map(normalizeArtwork))
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      throw new Error("Storage quota exceeded while saving imported artworks.");
    }
    throw error;
  }
};

const writeOverrides = (overrides: Record<string, Artwork>) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    KNOWLEDGE_BASE_OVERRIDES_KEY,
    JSON.stringify(
      Object.fromEntries(
        Object.entries(overrides).map(([id, artwork]) => [id, normalizeArtwork(artwork)])
      )
    )
  );
};

const writeDeletedIds = (deletedIds: string[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(KNOWLEDGE_BASE_DELETED_KEY, JSON.stringify(deletedIds));
};

export const fetchKnowledgeBase = async (): Promise<Artwork[]> => {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    return getLocalKnowledgeBase();
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
  } catch {
    return getLocalKnowledgeBase();
  }
};

export const fetchImportedArtworks = async (): Promise<Artwork[]> => {
  const allArtworks = await fetchKnowledgeBase();

  if (isSupabaseConfigured()) {
    return allArtworks.filter((artwork) => artwork.id.startsWith("imported-"));
  }

  return readImportedArtworks();
};

export const saveImportedArtwork = async (artwork: Artwork) => {
  if (!isSupabaseConfigured() || typeof window === "undefined") {
    const importedArtworks = getImportedArtworks();
    writeImportedArtworks([normalizeArtwork(artwork), ...importedArtworks]);
    return normalizeArtwork(artwork);
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
    if (!artwork.id.startsWith("imported-")) {
      const overrides = readOverrides();
      writeOverrides({
        ...overrides,
        [artwork.id]: normalizeArtwork(artwork),
      });
      return normalizeArtwork(artwork);
    }

    const importedArtworks = getImportedArtworks();
    writeImportedArtworks(
      importedArtworks.map((item) =>
        item.id === artwork.id ? normalizeArtwork(artwork) : item
      )
    );
    return normalizeArtwork(artwork);
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
    if (!artworkId.startsWith("imported-")) {
      const deletedIds = new Set(readDeletedIds());
      deletedIds.add(artworkId);
      writeDeletedIds(Array.from(deletedIds));
      return;
    }

    const importedArtworks = getImportedArtworks();
    writeImportedArtworks(importedArtworks.filter((item) => item.id !== artworkId));
    return;
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

const needsSignatureRefresh = (artwork: Artwork) =>
  !artwork.imageSignature?.rowProfile ||
  !artwork.imageSignature?.columnProfile ||
  !artwork.imageSignature?.luminanceGrid ||
  !artwork.imageSignature?.edgeOrientationHistogram;

export const rehydrateImportedArtworkSignatures = async () => {
  if (typeof window === "undefined" || isSupabaseConfigured()) {
    return false;
  }

  const importedArtworks = getImportedArtworks();
  const staleArtworks = importedArtworks.filter(needsSignatureRefresh);

  if (!staleArtworks.length) {
    return false;
  }

  const refreshed = await Promise.all(
    importedArtworks.map(async (artwork) => {
      if (!needsSignatureRefresh(artwork)) {
        return artwork;
      }

      try {
        const feature = await extractImageFeatureFromUrl(artwork.image);
        return {
          ...artwork,
          featureVector: feature.vector,
          imageSignature: feature.signature,
        };
      } catch {
        return artwork;
      }
    })
  );

  writeImportedArtworks(refreshed);
  return true;
};

export const clearImportedArtworks = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(KNOWLEDGE_BASE_KEY);
};
