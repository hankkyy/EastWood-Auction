import type { NextApiRequest, NextApiResponse } from "next";
import { uploadDataUrlToStorage } from "@/features/image-search/storageUpload";
import { VISUAL_SEARCH_QUERY_PREFIX } from "@/features/image-search/visualSearchShared";
import { isSupabaseConfigured } from "@/features/image-search/artworkCloud";
import { verifySupabaseUser } from "@/lib/supabase/auth";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "20mb",
    },
  },
};

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/^-+|-+$/g, "") || "query-image";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      error: "Supabase is not configured. Cloud persistence is required.",
    });
  }

  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const imageDataUrl =
    typeof req.body?.imageDataUrl === "string" ? req.body.imageDataUrl : "";
  const fileName =
    typeof req.body?.fileName === "string" ? req.body.fileName : "query-image";

  if (!imageDataUrl.startsWith("data:image/")) {
    return res.status(400).json({ error: "A valid image payload is required." });
  }

  const now = new Date();
  const safeName = sanitizeFileName(fileName);
  const extension = safeName.split(".").pop() || "jpg";
  const objectPath = [
    VISUAL_SEARCH_QUERY_PREFIX,
    `${now.getUTCFullYear()}`,
    `${now.getUTCMonth() + 1}`.padStart(2, "0"),
    `${now.getUTCDate()}`.padStart(2, "0"),
    `${crypto.randomUUID()}.${extension}`,
  ].join("/");

  try {
    const uploaded = await uploadDataUrlToStorage({
      dataUrl: imageDataUrl,
      objectPath,
    });

    return res.status(200).json({
      imageUrl: uploaded.publicUrl,
      objectPath: uploaded.objectPath,
    });
  } catch (error) {
    return res.status(500).json({
      error:
        error instanceof Error
          ? error.message
          : "Unable to upload the query image.",
    });
  }
}
