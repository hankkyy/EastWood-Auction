import { createClient } from "npm:@supabase/supabase-js@2.49.8";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EMBEDDING_API_URL = Deno.env.get("VISUAL_SEARCH_EMBEDDING_API_URL") ?? "";
const EMBEDDING_API_KEY = Deno.env.get("VISUAL_SEARCH_EMBEDDING_API_KEY") ?? "";
const EMBEDDING_DIMENSION = 512;
const DEFAULT_THRESHOLD = 0.2;
const MAX_RESULTS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

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
    `Network connection lost after ${attempts} attempts to ${url}. Last error: ${detail}`
  );
};

const computeImageEmbedding = async (imageUrl: string) => {
  if (!EMBEDDING_API_URL) {
    throw new Error(
      "VISUAL_SEARCH_EMBEDDING_API_URL is not configured for cloud embedding."
    );
  }

  const response = await fetchWithRetry(
    EMBEDDING_API_URL,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(EMBEDDING_API_KEY
          ? { Authorization: `Bearer ${EMBEDDING_API_KEY}` }
          : {}),
      },
      body: JSON.stringify({
        imageUrl,
        dimension: EMBEDDING_DIMENSION,
      }),
    },
    3,
    20000
  );

  const responseText = await response.text();
  const responseJson = responseText ? JSON.parse(responseText) : null;

  if (!response.ok) {
    throw new Error(
      responseJson?.error ||
        `Embedding API request failed with status ${response.status}.`
    );
  }

  const embedding = Array.isArray(responseJson?.embedding)
    ? responseJson.embedding.map((value: unknown) => Number(value))
    : [];

  if (embedding.length !== EMBEDDING_DIMENSION) {
    throw new Error(
      `Expected a ${EMBEDDING_DIMENSION}-dimension embedding, received ${embedding.length}.`
    );
  }

  return normalizeVector(embedding);
};

type VisualSearchRequest = {
  action?: "index-artwork" | "match-image";
  imageUrl?: string;
  artworkId?: string;
  threshold?: number;
  matchCount?: number;
  force?: boolean;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase function secrets are not configured.");
    }

    const body = (await request.json()) as VisualSearchRequest;
    const action = body.action;
    const imageUrl = body.imageUrl?.trim();

    if (!action || !imageUrl) {
      throw new Error("Both action and imageUrl are required.");
    }

    const embedding = await computeImageEmbedding(imageUrl);

    if (action === "index-artwork") {
      if (!body.artworkId) {
        throw new Error("artworkId is required for artwork indexing.");
      }

      if (!body.force) {
        const { data: existingArtwork, error: existingError } = await supabase
          .from("artworks")
          .select("id, image_embedding")
          .eq("id", body.artworkId)
          .single();

        if (existingError) {
          throw new Error(existingError.message);
        }

        if ((existingArtwork as { image_embedding?: unknown } | null)?.image_embedding) {
          return Response.json(
            {
              ok: true,
              action,
              imageUrl,
              indexedArtworkId: body.artworkId,
              embeddingDimension: EMBEDDING_DIMENSION,
            },
            {
              headers: {
                ...corsHeaders,
                "Content-Type": "application/json",
              },
            }
          );
        }
      }

      const { error: updateError } = await supabase
        .from("artworks")
        .update({
          image_embedding: toVectorLiteral(embedding),
        })
        .eq("id", body.artworkId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      return Response.json(
        {
          ok: true,
          action,
          imageUrl,
          indexedArtworkId: body.artworkId,
          embeddingDimension: EMBEDDING_DIMENSION,
        },
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    if (action === "match-image") {
      const threshold = Math.max(
        0,
        Number.isFinite(body.threshold) ? Number(body.threshold) : DEFAULT_THRESHOLD
      );
      const matchCount = Math.min(
        Math.max(1, Number(body.matchCount ?? MAX_RESULTS)),
        MAX_RESULTS
      );

      const { data, error } = await supabase.rpc("match_artworks_by_image", {
        query_embedding: toVectorLiteral(embedding),
        match_threshold: threshold,
        match_count: matchCount,
      });

      if (error) {
        throw new Error(error.message);
      }

      return Response.json(
        {
          ok: true,
          action,
          imageUrl,
          embeddingDimension: EMBEDDING_DIMENSION,
          matchThreshold: threshold,
          results: data ?? [],
        },
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    throw new Error(`Unsupported action "${action}".`);
  } catch (error) {
    return Response.json(
      {
        ok: false,
        action: "match-image",
        imageUrl: "",
        embeddingDimension: EMBEDDING_DIMENSION,
        error: error instanceof Error ? error.message : "Unexpected error.",
      },
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
