import type {
  Artwork,
  ArtworkCaseRecord,
  ArtworkFeatureVector,
  ArtworkImageSignature,
  ArtworkListingType,
} from "@/data/artworks";

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
  image_signature: ArtworkImageSignature | null;
  case_record: ArtworkCaseRecord | null;
  uploaded_by: string | null; // 上传者用户ID (UUID)
  is_official: boolean | null; // 是否为官方/平台内容
  is_for_sale: boolean | null; // 是否可售
  price: number | null; // 售价
  currency: 'USD' | 'CNY' | null; // 货币单位
  collection_id: string | null; // 藏品编号（唯一标识）
  created_at?: string;
  updated_at?: string;
};

export const isSupabaseConfigured = () =>
  Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

export const normalizeArtwork = (artwork: Artwork): Artwork => ({
  ...artwork,
  listingType: artwork.listingType ?? "product",
  galleryImages:
    artwork.galleryImages?.length ? artwork.galleryImages : [artwork.image],
});

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
  image_signature: artwork.imageSignature ?? null,
  case_record: artwork.caseRecord ?? null,
  uploaded_by: artwork.uploadedBy ?? null,
  is_official: artwork.isOfficial ?? false,
  is_for_sale: artwork.isForSale ?? false,
  price: artwork.price ?? null,
  currency: artwork.currency ?? 'CNY',
  collection_id: artwork.collectionId ?? null,
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
    imageSignature: row.image_signature ?? undefined,
    caseRecord: row.case_record ?? undefined,
    uploadedBy: row.uploaded_by ?? undefined,
    isOfficial: row.is_official ?? false,
    isForSale: row.is_for_sale ?? false,
    price: row.price ?? undefined,
    currency: row.currency ?? 'CNY',
    collectionId: row.collection_id ?? undefined,
  });
