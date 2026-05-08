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

const writeImportedArtworks = (artworks: Artwork[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    KNOWLEDGE_BASE_KEY,
    JSON.stringify(artworks.map(normalizeArtwork))
  );
};

export const saveImportedArtwork = (artwork: Artwork) => {
  const importedArtworks = getImportedArtworks();
  writeImportedArtworks([normalizeArtwork(artwork), ...importedArtworks]);
};

export const updateImportedArtwork = (artwork: Artwork) => {
  const importedArtworks = getImportedArtworks();
  writeImportedArtworks(
    importedArtworks.map((item) =>
      item.id === artwork.id ? normalizeArtwork(artwork) : item
    )
  );
};

export const deleteImportedArtwork = (artworkId: string) => {
  const importedArtworks = getImportedArtworks();
  writeImportedArtworks(importedArtworks.filter((item) => item.id !== artworkId));
};

export const clearImportedArtworks = () => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(KNOWLEDGE_BASE_KEY);
};
