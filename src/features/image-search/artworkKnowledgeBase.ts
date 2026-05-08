import { artworks } from "@/data/artworks";
import type { Artwork } from "@/data/artworks";

const KNOWLEDGE_BASE_KEY = "museum-art-image-knowledge-base";

const normalizeArtwork = (artwork: Artwork): Artwork => ({
  ...artwork,
  listingType: artwork.listingType ?? "product",
});

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

export const getKnowledgeBase = (): Artwork[] => {
  const seededArtworks = artworks.map(normalizeArtwork);

  if (typeof window === "undefined") {
    return seededArtworks;
  }

  return [...seededArtworks, ...readImportedArtworks()];
};

export const getImportedArtworks = (): Artwork[] => readImportedArtworks();

export const saveImportedArtwork = (artwork: Artwork) => {
  if (typeof window === "undefined") {
    return;
  }

  const importedArtworks = getImportedArtworks();
  window.localStorage.setItem(
    KNOWLEDGE_BASE_KEY,
    JSON.stringify([normalizeArtwork(artwork), ...importedArtworks])
  );
};

export const clearImportedArtworks = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(KNOWLEDGE_BASE_KEY);
};
