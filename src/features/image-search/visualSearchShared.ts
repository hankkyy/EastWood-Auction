export const VISUAL_SEARCH_FUNCTION_NAME =
  "artwork-visual-search";

export const VISUAL_SEARCH_QUERY_PREFIX =
  "visual-search-queries";

export const VISUAL_SEARCH_EMBEDDING_DIMENSION = 512;
export const VISUAL_SEARCH_DEFAULT_THRESHOLD = 0.2;
export const VISUAL_SEARCH_MAX_RESULTS = 5;

export type VisualSearchFunctionAction =
  | "index-artwork"
  | "match-image";

export type VisualSearchFunctionRequest = {
  action: VisualSearchFunctionAction;
  imageUrl: string;
  artworkId?: string;
  threshold?: number;
  matchCount?: number;
  force?: boolean;
};

export type VisualSearchMatchRow = {
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
  listing_type: "product" | "collection";
  feature_vector: number[];
  image_signature: Record<string, unknown> | null;
  case_record: Record<string, unknown> | null;
  uploaded_by: string | null;
  is_official: boolean | null;
  is_for_sale: boolean | null;
  price: number | null;
  currency: "USD" | "CNY" | null;
  collection_id: string | null;
  similarity: number;
};

export type VisualSearchFunctionResponse = {
  ok: boolean;
  action: VisualSearchFunctionAction;
  imageUrl: string;
  embeddingDimension: number;
  indexedArtworkId?: string;
  matchThreshold?: number;
  results?: VisualSearchMatchRow[];
  error?: string;
};
