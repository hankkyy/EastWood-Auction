import { createClient } from "npm:@supabase/supabase-js@2.49.8";
import { env, pipeline } from "npm:@xenova/transformers@2.17.2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const MODEL_NAME = "Xenova/clip-vit-base-patch32";
const EMBEDDING_DIMENSION = 512;
const DEFAULT_THRESHOLD = 0.2;
const MAX_RESULTS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

env.allowLocalModels = false;
env.useFSCache = false;
env.useBrowserCache = false;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

let extractorPromise: Promise<any> | null = null;

const getExtractor = async () => {
  if (!extractorPromise) {
    extractorPromise = pipeline("image-feature-extraction", MODEL_NAME, {
      quantized: true,
    });
  }

  return extractorPromise;
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

const computeImageEmbedding = async (imageUrl: string) => {
  const extractor = await getExtractor();
  const tensor = await extractor(imageUrl);
  const embedding = Array.from(tensor.data as Float32Array).map((value) =>
    Number(value)
  );

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
