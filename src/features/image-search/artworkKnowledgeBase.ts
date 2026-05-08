import { artworks } from "@/data/artworks";
import type { Artwork } from "@/data/artworks";

const KNOWLEDGE_BASE_KEY = "museum-art-image-knowledge-base";

export const getKnowledgeBase = (): Artwork[] => {
  if (typeof window === "undefined") {
    return artworks;
  }

  const stored = window.localStorage.getItem(KNOWLEDGE_BASE_KEY);

  if (!stored) {
    return artworks;
  }

  try {
    const importedArtworks = JSON.parse(stored) as Artwork[];
    return [...artworks, ...importedArtworks];
  } catch {
    return artworks;
  }
};

export const getImportedArtworks = (): Artwork[] => {
  if (typeof window === "undefined") {
    return [];
  }

  const stored = window.localStorage.getItem(KNOWLEDGE_BASE_KEY);

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as Artwork[];
  } catch {
    return [];
  }
};

export const saveImportedArtwork = (artwork: Artwork) => {
  if (typeof window === "undefined") {
    return;
  }

  const importedArtworks = getImportedArtworks();
  window.localStorage.setItem(
    KNOWLEDGE_BASE_KEY,
    JSON.stringify([artwork, ...importedArtworks])
  );
};

export const clearImportedArtworks = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(KNOWLEDGE_BASE_KEY);
};
