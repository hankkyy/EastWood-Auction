import { getSupabaseAdmin } from "@/lib/supabase/server";
import { VISUAL_SEARCH_EMBEDDING_DIMENSION } from "@/features/image-search/visualSearchShared";

type VisualSearchRpcRow = {
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

const toVectorLiteral = (values: number[]) => `[${values.join(",")}]`;

const normalizeVector = (values: number[]) => {
  const norm = Math.sqrt(
    values.reduce((sum, current) => sum + current * current, 0)
  );

  if (!norm) {
    return values;
  }

  return values.map((value) => value / norm);
};

const parseDataUrlImageBytes = (dataUrl: string) => {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid image payload.");
  }

  const [, mimeType, payload] = match;
  return {
    mimeType,
    bytes: Uint8Array.from(Buffer.from(payload, "base64")),
  };
};

const fetchImageBytes = async (imageUrl: string) => {
  const response = await fetchWithRetry(
    imageUrl,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EastwoodImageSearch/1.0)",
        Accept: "image/*,*/*;q=0.8",
      },
    },
    2,
    15000
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch source image: ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.startsWith("image/")) {
    throw new Error(`Unsupported image content-type: ${contentType}`);
  }

  return new Uint8Array(await response.arrayBuffer());
};

const parseEmbeddingResponse = (payload: unknown): number[] => {
  if (Array.isArray(payload)) {
    if (payload.length > 0 && Array.isArray(payload[0])) {
      return payload[0].map((value: unknown) => Number(value));
    }

    return payload.map((value: unknown) => Number(value));
  }

  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { embedding?: unknown[] }).embedding)
  ) {
    return (payload as { embedding: unknown[] }).embedding.map((value) =>
      Number(value)
    );
  }

  return [];
};

const fetchWithRetry = async (
  url: string,
  init: RequestInit,
  attempts = 3,
  timeoutMs = 20000
): Promise<Response> => {
  let lastError: unknown;

  for (let i = 0; i < attempts; i += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timer);
      return response;
    } catch (error) {
      clearTimeout(timer);
      lastError = error;

      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (i + 1)));
      }
    }
  }

  const detail =
    lastError instanceof Error
      ? `${lastError.name}: ${lastError.message}`
      : String(lastError ?? "unknown");

  throw new Error(
    `Embedding request failed after ${attempts} attempts to ${url}. Last error: ${detail}`
  );
};

export const matchArtworkImageViaNode = async (params: {
  imageUrl?: string;
  imageDataUrl?: string;
  threshold: number;
  matchCount: number;
}) => {
  const embeddingApiUrl = process.env.VISUAL_SEARCH_EMBEDDING_API_URL ?? "";
  const embeddingApiKey = process.env.VISUAL_SEARCH_EMBEDDING_API_KEY ?? "";

  if (!embeddingApiUrl) {
    throw new Error("VISUAL_SEARCH_EMBEDDING_API_URL is not configured.");
  }

  const isHuggingFaceEndpoint =
    embeddingApiUrl.includes("huggingface.co") ||
    embeddingApiUrl.includes("hf-inference");
  const imageSource = params.imageDataUrl ?? params.imageUrl;

  if (!imageSource) {
    throw new Error("An image source is required.");
  }

  const embeddingResponse = isHuggingFaceEndpoint
    ? await (async () => {
        const imagePayload = params.imageDataUrl
          ? parseDataUrlImageBytes(params.imageDataUrl)
          : {
              mimeType: "image/jpeg",
              bytes: await fetchImageBytes(params.imageUrl as string),
            };
        return fetchWithRetry(
          embeddingApiUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": imagePayload.mimeType,
              ...(embeddingApiKey
                ? { Authorization: `Bearer ${embeddingApiKey}` }
                : {}),
            },
            body: imagePayload.bytes,
          },
          3,
          30000
        );
      })()
    : await fetchWithRetry(
        embeddingApiUrl,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(embeddingApiKey
              ? { Authorization: `Bearer ${embeddingApiKey}` }
              : {}),
          },
          body: JSON.stringify({
            imageUrl: imageSource,
            dimension: VISUAL_SEARCH_EMBEDDING_DIMENSION,
          }),
        },
        3,
        20000
      );

  const embeddingText = await embeddingResponse.text();
  const embeddingJson = embeddingText ? JSON.parse(embeddingText) : null;

  if (!embeddingResponse.ok) {
    throw new Error(
      embeddingJson?.error ||
        `Embedding API request failed with status ${embeddingResponse.status}.`
    );
  }

  const embedding = parseEmbeddingResponse(embeddingJson);

  if (embedding.length !== VISUAL_SEARCH_EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected a ${VISUAL_SEARCH_EMBEDDING_DIMENSION}-dimension embedding, received ${embedding.length}.`
    );
  }

  const normalizedEmbedding = normalizeVector(embedding);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.rpc("match_artworks_by_image", {
    query_embedding: toVectorLiteral(normalizedEmbedding),
    match_threshold: params.threshold,
    match_count: params.matchCount,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    imageUrl: imageSource,
    matchThreshold: params.threshold,
    results: (data ?? []) as VisualSearchRpcRow[],
  };
};
