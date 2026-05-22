import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

type ArtworkRow = {
  id: string;
  image: string;
  image_embedding?: string | number[] | null;
};

const VISUAL_SEARCH_FUNCTION_NAME = "artwork-visual-search";

const loadEnvFile = (filePath: string) => {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const normalizedValue = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = normalizedValue;
    }
  }
};

loadEnvFile(path.join(process.cwd(), ".env.local"));
loadEnvFile(path.join(process.cwd(), ".env"));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const functionUrl = `${supabaseUrl}/functions/v1/${VISUAL_SEARCH_FUNCTION_NAME}`;
const force = process.argv.includes("--force");

const invokeIndexing = async (artworkId: string, imageUrl: string) => {
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
    },
    body: JSON.stringify({
      action: "index-artwork",
      artworkId,
      imageUrl,
      force,
    }),
  });

  const body = await response.json();

  if (!response.ok || !body.ok) {
    throw new Error(body.error || `Indexing failed for artwork ${artworkId}.`);
  }
};

const main = async () => {
  const selectFields = "id, image, image_embedding";
  let query = supabase.from("artworks").select(selectFields);

  if (!force) {
    query = query.is("image_embedding", null);
  }

  const { data, error } = await query.order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const artworks = (data ?? []) as ArtworkRow[];

  console.log(
    `[syncArtworkEmbeddings] ${force ? "Re-indexing" : "Indexing"} ${artworks.length} artworks...`
  );

  for (const artwork of artworks) {
    console.log(`[syncArtworkEmbeddings] Processing ${artwork.id}`);
    await invokeIndexing(artwork.id, artwork.image);
  }

  console.log("[syncArtworkEmbeddings] Done.");
};

main().catch((error) => {
  console.error("[syncArtworkEmbeddings] Failed:", error);
  process.exit(1);
});
