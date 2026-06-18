import type {
  Artwork,
  ArtworkCaseRecord,
  ArtworkFeatureVector,
  ArtworkImageSignature,
  ArtworkListingType,
  ThreeDModel,
} from "@/data/artworks";
import { hasSupabaseClientConfig } from "@/lib/supabase/config";
import {
  normalizeArtworkIdentifiers,
  normalizeCaseId,
  normalizeCollectionId,
} from "@/lib/artworkIds";

export type ThreeDModelRow = {
  url: string;
  format: 'usdz' | 'glb';
  thumbnail_url: string;
  poster_url: string;
  file_size: number;
  vertex_count?: number;
  face_count?: number;
  scan_date?: string;
} | null;

export type ArtworkRow = {
  id: string;
  title: string;
  title_zh: string | null;
  category: string;
  category_zh: string | null;
  period: string;
  period_zh: string | null;
  image: string;
  gallery_images: string[] | null;
  description: string;
  description_zh: string | null;
  listing_type: ArtworkListingType;
  feature_vector: ArtworkFeatureVector;
  image_embedding?: number[] | string | null;
  image_signature: ArtworkImageSignature | null;
  case_record: ArtworkCaseRecord | null;
  uploaded_by: string | null; // 上传者用户ID (UUID)
  is_official: boolean | null; // 是否为官方/平台内容
  is_for_sale: boolean | null; // 是否可售
  price: number | null; // 售价
  currency: 'USD' | 'CNY' | null; // 货币单位
  collection_id: string | null; // 藏品编号（唯一标识）
  three_d_model: ThreeDModelRow; // LiDAR 3D 模型
  created_at?: string;
  updated_at?: string;
};

export const isSupabaseConfigured = hasSupabaseClientConfig;

export const normalizeArtwork = (artwork: Artwork): Artwork => ({
  ...artwork,
  ...normalizeArtworkIdentifiers(artwork),
  listingType: artwork.listingType ?? "product",
  galleryImages:
    artwork.galleryImages?.length ? artwork.galleryImages : [artwork.image],
});

const parseImageEmbedding = (
  value: ArtworkRow["image_embedding"]
): number[] | undefined => {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((item) => Number(item));
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item));
      }
    } catch (error) {
      console.warn("[artworkCloud] Unable to parse image embedding:", error);
    }
  }

  return undefined;
};

export const artworkToRow = (artwork: Artwork): ArtworkRow => ({
  id: artwork.id,
  title: artwork.title,
  title_zh: artwork.titleZh ?? null,
  category: artwork.category,
  category_zh: artwork.categoryZh ?? null,
  period: artwork.period,
  period_zh: artwork.periodZh ?? null,
  image: artwork.image,
  gallery_images: artwork.galleryImages?.length ? artwork.galleryImages : [artwork.image],
  description: artwork.description,
  description_zh: artwork.descriptionZh ?? null,
  listing_type: artwork.listingType ?? "product",
  feature_vector: artwork.featureVector,
  ...(artwork.imageEmbedding
    ? {
        image_embedding: `[${artwork.imageEmbedding.join(",")}]`,
      }
    : {}),
  image_signature: artwork.imageSignature ?? null,
  case_record: artwork.caseRecord
    ? {
        ...artwork.caseRecord,
        caseId: normalizeCaseId(artwork.caseRecord.caseId) ?? artwork.caseRecord.caseId,
      }
    : null,
  uploaded_by: artwork.uploadedBy ?? null,
  is_official: artwork.isOfficial ?? false,
  is_for_sale: artwork.isForSale ?? false,
  price: artwork.price ?? null,
  currency: artwork.currency ?? 'CNY',
  collection_id: normalizeCollectionId(artwork.collectionId) ?? null,
  three_d_model: artwork.threeDModel
    ? {
        url: artwork.threeDModel.url,
        format: artwork.threeDModel.format,
        thumbnail_url: artwork.threeDModel.thumbnailUrl,
        poster_url: artwork.threeDModel.posterUrl,
        file_size: artwork.threeDModel.fileSize,
        vertex_count: artwork.threeDModel.vertexCount ?? undefined,
        face_count: artwork.threeDModel.faceCount ?? undefined,
        scan_date: artwork.threeDModel.scanDate ?? undefined,
      }
    : null,
});

export const rowToArtwork = (row: ArtworkRow): Artwork =>
  normalizeArtwork({
    id: row.id,
    title: row.title,
    titleZh: row.title_zh ?? undefined,
    category: row.category,
    categoryZh: row.category_zh ?? undefined,
    period: row.period,
    periodZh: row.period_zh ?? undefined,
    image: row.image,
    galleryImages: row.gallery_images ?? [row.image],
    description: row.description,
    descriptionZh: row.description_zh ?? undefined,
    listingType: row.listing_type,
    featureVector: row.feature_vector,
    imageEmbedding: parseImageEmbedding(row.image_embedding),
    imageSignature: row.image_signature ?? undefined,
    caseRecord: row.case_record ?? undefined,
    uploadedBy: row.uploaded_by ?? undefined,
    isOfficial: row.is_official ?? false,
    isForSale: row.is_for_sale ?? false,
    price: row.price ?? undefined,
    currency: row.currency ?? 'CNY',
    collectionId: row.collection_id ?? undefined,
    threeDModel: row.three_d_model
      ? {
          url: row.three_d_model.url,
          format: row.three_d_model.format,
          thumbnailUrl: row.three_d_model.thumbnail_url,
          posterUrl: row.three_d_model.poster_url,
          fileSize: row.three_d_model.file_size,
          vertexCount: row.three_d_model.vertex_count ?? undefined,
          faceCount: row.three_d_model.face_count ?? undefined,
          scanDate: row.three_d_model.scan_date ?? undefined,
        }
      : undefined,
  });
