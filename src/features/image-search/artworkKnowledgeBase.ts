import { artworks } from "@/data/artworks";
import type { Artwork } from "@/data/artworks";
import { extractImageFeatureFromUrl } from "@/features/image-search/imageSearch";

const KNOWLEDGE_BASE_KEY = "museum-art-image-knowledge-base";
const KNOWLEDGE_BASE_OVERRIDES_KEY = "museum-art-image-knowledge-base-overrides";
const KNOWLEDGE_BASE_DELETED_KEY = "museum-art-image-knowledge-base-deleted";

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

export const getKnowledgeBase = (): Artwork[] => {
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

export const getImportedArtworks = (): Artwork[] => readImportedArtworks();

const writeImportedArtworks = (artworks: Artwork[]) => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(
      KNOWLEDGE_BASE_KEY,
      JSON.stringify(artworks.map(normalizeArtwork))
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

export const saveImportedArtwork = (artwork: Artwork) => {
  const importedArtworks = getImportedArtworks();
  writeImportedArtworks([normalizeArtwork(artwork), ...importedArtworks]);
};

export const updateImportedArtwork = (artwork: Artwork) => {
  if (!artwork.id.startsWith("imported-")) {
    const overrides = readOverrides();
    writeOverrides({
      ...overrides,
      [artwork.id]: normalizeArtwork(artwork),
    });
    return;
  }

  const importedArtworks = getImportedArtworks();
  writeImportedArtworks(
    importedArtworks.map((item) =>
      item.id === artwork.id ? normalizeArtwork(artwork) : item
    )
  );
};

export const deleteImportedArtwork = (artworkId: string) => {
  if (!artworkId.startsWith("imported-")) {
    const deletedIds = new Set(readDeletedIds());
    deletedIds.add(artworkId);
    writeDeletedIds([...deletedIds]);
    return;
  }

  const importedArtworks = getImportedArtworks();
  writeImportedArtworks(importedArtworks.filter((item) => item.id !== artworkId));
};


const needsSignatureRefresh = (artwork: Artwork) =>
  !artwork.imageSignature?.rowProfile ||
  !artwork.imageSignature?.columnProfile ||
  !artwork.imageSignature?.luminanceGrid ||
  !artwork.imageSignature?.edgeOrientationHistogram;

export const rehydrateImportedArtworkSignatures = async () => {
  if (typeof window === "undefined") {
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
