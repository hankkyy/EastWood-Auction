const randomSuffix = () => {
  const letters = String.fromCharCode(65 + Math.floor(Math.random() * 26)) +
    String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const digits = String(Math.floor(Math.random() * 10)) + String(Math.floor(Math.random() * 10));
  return `${letters}${digits}`;
};

const formatDateCode = (date: Date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  return `${month}${day}${year}`;
};

export const generateCollectionId = (date = new Date()) =>
  `COL-${formatDateCode(date)}-${randomSuffix()}`;

export const generateCaseId = (date = new Date()) =>
  `CASE-${formatDateCode(date)}-${randomSuffix()}`;

const normalizeLegacyCode = (value: string, expectedPrefix: "COL" | "CASE") => {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  const match = trimmed.match(/^([a-z]+)-(\d{6}|\d{8})-([a-z0-9]{4})$/i);
  if (!match) return trimmed.toUpperCase();

  const [, prefix, rawDate, suffix] = match;
  if (prefix.toUpperCase() !== expectedPrefix) return trimmed.toUpperCase();

  const date = rawDate.length === 8
    ? `${rawDate.slice(0, 4)}${rawDate.slice(6, 8)}`
    : rawDate;

  return `${expectedPrefix}-${date}-${suffix.toUpperCase()}`;
};

export const normalizeCollectionId = (value?: string | null) => {
  if (!value) return undefined;
  return normalizeLegacyCode(value, "COL");
};

export const normalizeCaseId = (value?: string | null) => {
  if (!value) return undefined;
  return normalizeLegacyCode(value, "CASE");
};

export const normalizeArtworkIdentifiers = <
  T extends {
    collectionId?: string | null;
    caseRecord?: { caseId?: string | null } | null;
  }
>(
  artwork: T
): T => {
  const collectionId = normalizeCollectionId(artwork.collectionId);
  const caseId = normalizeCaseId(artwork.caseRecord?.caseId);

  return {
    ...artwork,
    collectionId: collectionId ?? artwork.collectionId,
    caseRecord: artwork.caseRecord
      ? {
          ...artwork.caseRecord,
          caseId: caseId ?? artwork.caseRecord.caseId,
        }
      : artwork.caseRecord,
  };
};
