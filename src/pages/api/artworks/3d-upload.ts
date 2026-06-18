import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MODEL_BUCKET = "3d-models";

// Reuse multipart parser — same logic as [id]/3d-model.ts
async function parseMultipart(req: NextApiRequest): Promise<{
  files: Record<string, { buffer: Buffer; mimeType: string; fileName: string }>;
}> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      const raw = Buffer.concat(chunks);
      const contentType = req.headers["content-type"] || "";
      const boundaryMatch = contentType.match(/boundary=(.+)$/);
      if (!boundaryMatch) return reject(new Error("No multipart boundary"));

      const boundary = boundaryMatch[1].trim();
      const boundaryBuf = Buffer.from(`--${boundary}`);
      const endBoundary = Buffer.from(`--${boundary}--`);
      const parts: Buffer[] = [];
      let start = raw.indexOf(boundaryBuf);

      while (start !== -1) {
        let end = raw.indexOf(boundaryBuf, start + boundaryBuf.length);
        if (end === -1) {
          end = raw.indexOf(endBoundary, start + boundaryBuf.length);
          if (end === -1) break;
        }
        let trimmed = raw.subarray(start + boundaryBuf.length, end);
        if (trimmed[0] === 0x0d) trimmed = trimmed.subarray(1);
        if (trimmed[0] === 0x0a) trimmed = trimmed.subarray(1);
        if (trimmed.length >= 2 && trimmed[trimmed.length - 2] === 0x0d && trimmed[trimmed.length - 1] === 0x0a) {
          trimmed = trimmed.subarray(0, trimmed.length - 2);
        }
        if (trimmed.length > 0) parts.push(trimmed);
        start = raw.indexOf(boundaryBuf, end);
      }

      const files: Record<string, { buffer: Buffer; mimeType: string; fileName: string }> = {};
      for (const part of parts) {
        const headerEnd = part.indexOf("\r\n\r\n");
        if (headerEnd === -1) continue;
        const headerStr = part.subarray(0, headerEnd).toString("utf-8");
        const data = part.subarray(headerEnd + 4);
        const nameMatch = headerStr.match(/name="([^"]+)"/);
        if (!nameMatch) continue;
        const name = nameMatch[1];
        const fnMatch = headerStr.match(/filename="([^"]+)"/);
        const ctMatch = headerStr.match(/Content-Type:\s*(.+)/i);
        if (fnMatch) {
          files[name] = {
            buffer: data,
            mimeType: ctMatch ? ctMatch[1].trim() : "application/octet-stream",
            fileName: fnMatch[1],
          };
        }
      }
      resolve({ files });
    });
    req.on("error", reject);
  });
}

/**
 * POST /api/artworks/3d-upload
 *
 * Standalone 3D model upload — returns a Native3DModel object
 * that can be embedded into a new artwork during creation.
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

  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    const { files } = await parseMultipart(req);
    const modelFile = files["model"];
    const thumbnailFile = files["thumbnail"];

    if (!modelFile || !thumbnailFile) {
      return res.status(400).json({
        error: "Both 'model' and 'thumbnail' files are required.",
      });
    }

    const isUsdz = modelFile.fileName.endsWith(".usdz") || modelFile.mimeType === "model/vnd.usdz+zip";
    const isGlb = modelFile.fileName.endsWith(".glb") || modelFile.mimeType === "model/gltf-binary";
    const format = isUsdz ? "usdz" : isGlb ? "glb" : null;

    if (!format) {
      return res.status(400).json({ error: "Unsupported format. Use USDZ or GLB." });
    }

    if (modelFile.buffer.length > 50 * 1024 * 1024) {
      return res.status(400).json({
        error: "File exceeds 50MB. Free plan limit. Upgrade to Supabase Pro or reduce scan quality."
      });
    }

    const supabase = getSupabaseAdmin();
    const uploadId = `new_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    // Upload model
    const modelExt = format === "usdz" ? "usdz" : "glb";
    const modelPath = `${uploadId}/model.${modelExt}`;
    const modelContentType = format === "usdz" ? "model/vnd.usdz+zip" : "model/gltf-binary";

    const { error: modelErr } = await supabase.storage
      .from(MODEL_BUCKET)
      .upload(modelPath, modelFile.buffer, {
        contentType: modelContentType,
        upsert: true,
      });

    if (modelErr) {
      return res.status(500).json({ error: "Failed to upload 3D model." });
    }

    const { data: modelUrlData } = supabase.storage
      .from(MODEL_BUCKET)
      .getPublicUrl(modelPath);

    // Upload thumbnail
    const thumbExt = thumbnailFile.fileName.endsWith(".png") ? "png" : "jpg";
    const thumbPath = `${uploadId}/thumbnail.${thumbExt}`;

    await supabase.storage
      .from(MODEL_BUCKET)
      .upload(thumbPath, thumbnailFile.buffer, {
        contentType: thumbnailFile.mimeType || "image/jpeg",
        upsert: true,
      });

    const { data: thumbUrlData } = supabase.storage
      .from(MODEL_BUCKET)
      .getPublicUrl(thumbPath);

    const modelUrl = modelUrlData?.publicUrl || "";
    const thumbUrl = thumbUrlData?.publicUrl || "";

    const threeDModel = {
      url: modelUrl,
      format,
      thumbnail_url: thumbUrl,
      poster_url: thumbUrl,
      file_size: modelFile.buffer.length,
      vertex_count: null,
      face_count: null,
      scan_date: new Date().toISOString(),
    };

    return res.status(201).json({ three_d_model: threeDModel });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Upload failed.",
    });
  }
}
