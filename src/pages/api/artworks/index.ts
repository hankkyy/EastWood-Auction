import type { NextApiRequest, NextApiResponse } from "next";
import type { Artwork } from "@/data/artworks";
import {
  artworkToRow,
  isSupabaseConfigured,
  normalizeArtwork,
  rowToArtwork,
  type ArtworkRow,
} from "@/features/image-search/artworkCloud";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
import { triggerArtworkImageIndexing } from "@/features/image-search/visualSearchServer";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin, getSupabaseBucket } from "@/lib/supabase/server";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "30mb",
    },
  },
};

const TABLE_NAME = "artworks";

const isDataUrl = (value: string) => value.startsWith("data:");

const parseDataUrl = (value: string) => {
  const match = value.match(/^data:(.+?);base64,(.+)$/);

  if (!match) {
    throw new Error("Invalid image payload.");
  }

  const [, mimeType, base64Payload] = match;
  const extension = mimeType.split("/")[1] || "jpg";

  return {
    mimeType,
    extension: extension === "jpeg" ? "jpg" : extension,
    buffer: Buffer.from(base64Payload, "base64"),
  };
};

const persistGalleryImages = async (
  artwork: Artwork
): Promise<{ image: string; galleryImages: string[] }> => {
  const supabase = getSupabaseAdmin();
  const bucket = getSupabaseBucket();
  const sourceGallery = artwork.galleryImages?.length
    ? artwork.galleryImages
    : [artwork.image];

  const uploadedGallery = await Promise.all(
    sourceGallery.map(async (imageUrl, index) => {
      if (!isDataUrl(imageUrl)) {
        return imageUrl;
      }

      try {
        const { buffer, mimeType, extension } = parseDataUrl(imageUrl);
        const objectPath = `${artwork.listingType}/${artwork.id}/${Date.now()}-${index}.${extension}`;

        const { error } = await supabase.storage
          .from(bucket)
          .upload(objectPath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (error) {
          console.error(`[API] Failed to upload image ${index}:`, error);
          throw new Error(error.message);
        }

        const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        return data.publicUrl;
      } catch (error) {
        console.error(`[API] Error processing image ${index}:`, error);
        throw error;
      }
    })
  );

  const coverIndex = sourceGallery.findIndex((imageUrl) => imageUrl === artwork.image);
  const coverImage =
    (coverIndex >= 0 ? uploadedGallery[coverIndex] : undefined) ??
    uploadedGallery[0] ??
    artwork.image;

  return {
    image: coverImage,
    galleryImages: uploadedGallery.length ? uploadedGallery : [artwork.image],
  };
};

const sanitizeArtworkForCreate = (artwork: Artwork, isAdmin: boolean, userId?: string): Artwork => {
  const normalized = normalizeArtwork(artwork);

  if (!isAdmin && !normalized.caseRecord) {
    throw new Error("Only administrators can create collections or shop items.");
  }

  const baseArtwork: Artwork = {
    ...normalized,
    uploadedBy: userId,
    isOfficial: isAdmin || false,
  };

  if (!isAdmin) {
    return {
      ...baseArtwork,
      listingType: "product",
      collectionId: undefined,
      isForSale: false,
      price: undefined,
      currency: undefined,
    };
  }

  return baseArtwork;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        error: "Supabase is not configured. Cloud persistence is required.",
      });
    }

    try {
      const artworksWithUploader = await fetchKnowledgeBaseServer();

      return res.status(200).json({
        artworks: artworksWithUploader,
        mode: "cloud",
      });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to load artworks.",
      });
    }
  }

  if (req.method === "POST") {
    const artwork = req.body?.artwork as Artwork | undefined;

    if (!artwork) {
      return res.status(400).json({ error: "Artwork payload is required." });
    }

    if (!isSupabaseConfigured()) {
      return res.status(503).json({
        error: "Supabase is not configured. Add the required environment variables first.",
      });
    }

    // 验证用户登录状态（不限制角色）
    const auth = await verifySupabaseUser(req);
    if (!auth.ok) {
      return res.status(auth.status).json({ error: auth.error });
    }

    try {
      const sanitizedArtwork = sanitizeArtworkForCreate(artwork, auth.isAdmin, auth.userId);
      const uploadedImages = await persistGalleryImages(sanitizedArtwork);
      const supabase = getSupabaseAdmin();

      const artworkWithOfficial = {
        ...sanitizedArtwork,
        image: uploadedImages.image,
        galleryImages: uploadedImages.galleryImages,
      };
      
      const row = artworkToRow(artworkWithOfficial);

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(row as any)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      try {
        await triggerArtworkImageIndexing({
          artworkId: row.id,
          imageUrl: row.image,
        });
      } catch (indexingError) {
        console.error("[API] Unable to index artwork image:", indexingError);
      }

      return res.status(201).json({ artwork: rowToArtwork(data as ArtworkRow) });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to save artwork.",
      });
    }
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
