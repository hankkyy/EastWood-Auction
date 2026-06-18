import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin, getSupabaseBucket } from "@/lib/supabase/server";

export const config = {
  api: {
    bodyParser: false, // multipart form data
  },
};

// 3D model bucket name — separate from the artwork-images bucket
const MODEL_BUCKET = "3d-models";

async function parseMultipart(req: NextApiRequest): Promise<{
  fields: Record<string, string>;
  files: Record<string, { buffer: Buffer; mimeType: string; fileName: string }>;
}> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      const contentType = req.headers["content-type"] || "";

      // Simple multipart parser
      const boundaryMatch = contentType.match(/boundary=(.+)$/);
      if (!boundaryMatch) {
        reject(new Error("No multipart boundary"));
        return;
      }

      const boundary = boundaryMatch[1].trim();
      const parts = splitMultipart(raw, boundary);

      const fields: Record<string, string> = {};
      const files: Record<string, { buffer: Buffer; mimeType: string; fileName: string }> = {};

      for (const part of parts) {
        const parsed = parsePart(part);
        if (!parsed) continue;

        if (parsed.fileName) {
          files[parsed.name] = {
            buffer: parsed.data,
            mimeType: parsed.contentType || "application/octet-stream",
            fileName: parsed.fileName,
          };
        } else {
          fields[parsed.name] = parsed.data.toString("utf-8");
        }
      }

      resolve({ fields, files });
    });

    req.on("error", reject);
  });
}

function splitMultipart(raw: Buffer, boundary: string): Buffer[] {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const endBoundary = Buffer.from(`--${boundary}--`);
  const parts: Buffer[] = [];
  let start = raw.indexOf(boundaryBuf);

  while (start !== -1) {
    let end = raw.indexOf(boundaryBuf, start + boundaryBuf.length);
    if (end === -1) {
      // Check for end boundary
      end = raw.indexOf(endBoundary, start + boundaryBuf.length);
      if (end === -1) break;
    }
    const part = raw.subarray(start + boundaryBuf.length, end);
    // Trim leading \r\n and trailing \r\n
    let trimmed = part;
    if (trimmed[0] === 0x0d) trimmed = trimmed.subarray(1);
    if (trimmed[0] === 0x0a) trimmed = trimmed.subarray(1);
    if (trimmed.length >= 2 && trimmed[trimmed.length - 2] === 0x0d && trimmed[trimmed.length - 1] === 0x0a) {
      trimmed = trimmed.subarray(0, trimmed.length - 2);
    }
    if (trimmed.length > 0) {
      parts.push(trimmed);
    }
    start = raw.indexOf(boundaryBuf, end);
  }

  return parts;
}

function parsePart(part: Buffer): {
  name: string;
  fileName?: string;
  contentType?: string;
  data: Buffer;
} | null {
  const headerEnd = part.indexOf("\r\n\r\n");
  if (headerEnd === -1) return null;

  const headerStr = part.subarray(0, headerEnd).toString("utf-8");
  const data = part.subarray(headerEnd + 4);

  const nameMatch = headerStr.match(/name="([^"]+)"/);
  if (!nameMatch) return null;

  const name = nameMatch[1];
  const fileNameMatch = headerStr.match(/filename="([^"]+)"/);
  const contentTypeMatch = headerStr.match(/Content-Type:\s*(.+)/i);

  return {
    name,
    fileName: fileNameMatch ? fileNameMatch[1] : undefined,
    contentType: contentTypeMatch ? contentTypeMatch[1].trim() : undefined,
    data,
  };
}

/**
 * POST /api/artworks/[id]/3d-model
 *
 * Uploads a 3D model (USDZ/GLB) + thumbnail to Supabase Storage
 * and links it to an existing artwork.
 *
 * Multipart fields:
 *   - model:    USDZ/GLB file
 *   - thumbnail: JPEG/PNG preview image
 *
 * Returns: { three_d_model: { url, format, thumbnail_url, poster_url, file_size, ... } }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { id: artworkId } = req.query;
  if (!artworkId || typeof artworkId !== "string") {
    return res.status(400).json({ error: "Artwork ID is required." });
  }

  // Authenticate
  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    // Parse multipart
    const { files } = await parseMultipart(req);

    const modelFile = files["model"];
    const thumbnailFile = files["thumbnail"];

    if (!modelFile) {
      return res.status(400).json({ error: "3D model file is required (field: 'model')." });
    }

    if (!thumbnailFile) {
      return res.status(400).json({ error: "Thumbnail image is required (field: 'thumbnail')." });
    }

    // Validate format
    const isUsdz = modelFile.fileName.endsWith(".usdz") || modelFile.mimeType === "model/vnd.usdz+zip";
    const isGlb = modelFile.fileName.endsWith(".glb") || modelFile.mimeType === "model/gltf-binary";
    const format = isUsdz ? "usdz" : isGlb ? "glb" : null;

    if (!format) {
      return res.status(400).json({
        error: "Unsupported 3D format. Please upload USDZ or GLB files.",
      });
    }

    // Max file size: 50MB (Supabase Free plan hard cap; Pro = 5GB)
    if (modelFile.buffer.length > 50 * 1024 * 1024) {
      return res.status(400).json({
        error: "3D model exceeds 50MB limit. Supabase Free plan caps uploads at 50MB. " +
               "Upgrade to Pro for larger files, or retry with reduced scan quality.",
      });
    }

    const supabase = getSupabaseAdmin();

    // Check artwork exists and user has permission
    const { data: existingArtwork, error: fetchError } = await supabase
      .from("artworks")
      .select("id, uploaded_by, is_official")
      .eq("id", artworkId)
      .single();

    if (fetchError || !existingArtwork) {
      return res.status(404).json({ error: "Artwork not found." });
    }

    // Only admins or the uploader can add 3D models
    if (!auth.isAdmin && existingArtwork.uploaded_by !== auth.userId) {
      return res.status(403).json({ error: "You don't have permission to modify this artwork." });
    }

    // Upload model file to Supabase Storage
    const modelExt = format === "usdz" ? "usdz" : "glb";
    const modelPath = `${artworkId}/model.${modelExt}`;
    const modelContentType = format === "usdz" ? "model/vnd.usdz+zip" : "model/gltf-binary";

    const { error: modelUploadError } = await supabase.storage
      .from(MODEL_BUCKET)
      .upload(modelPath, modelFile.buffer, {
        contentType: modelContentType,
        upsert: true,
      });

    if (modelUploadError) {
      console.error("[3D Upload] Failed to upload model:", modelUploadError);
      return res.status(500).json({ error: "Failed to upload 3D model file." });
    }

    const { data: modelUrlData } = supabase.storage
      .from(MODEL_BUCKET)
      .getPublicUrl(modelPath);

    // Upload thumbnail
    const thumbExt = thumbnailFile.fileName.endsWith(".png") ? "png" : "jpg";
    const thumbPath = `${artworkId}/thumbnail.${thumbExt}`;

    const { error: thumbUploadError } = await supabase.storage
      .from(MODEL_BUCKET)
      .upload(thumbPath, thumbnailFile.buffer, {
        contentType: thumbnailFile.mimeType || "image/jpeg",
        upsert: true,
      });

    if (thumbUploadError) {
      console.error("[3D Upload] Failed to upload thumbnail:", thumbUploadError);
      return res.status(500).json({ error: "Failed to upload thumbnail." });
    }

    const { data: thumbUrlData } = supabase.storage
      .from(MODEL_BUCKET)
      .getPublicUrl(thumbPath);

    const modelUrl = modelUrlData?.publicUrl || "";
    const thumbUrl = thumbUrlData?.publicUrl || "";
    const fileSize = modelFile.buffer.length;

    // Build three_d_model JSONB
    const threeDModel = {
      url: modelUrl,
      format,
      thumbnail_url: thumbUrl,
      poster_url: thumbUrl, // Thumbnail doubles as poster for now
      file_size: fileSize,
      vertex_count: null,
      face_count: null,
      scan_date: new Date().toISOString(),
    };

    // Update artwork
    const { error: updateError } = await supabase
      .from("artworks")
      .update({ three_d_model: threeDModel } as any)
      .eq("id", artworkId);

    if (updateError) {
      console.error("[3D Upload] Failed to update artwork:", updateError);
      return res.status(500).json({ error: "Failed to link 3D model to artwork." });
    }

    return res.status(200).json({ three_d_model: threeDModel });
  } catch (error) {
    console.error("[3D Upload] Unexpected error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "3D model upload failed.",
    });
  }
}
