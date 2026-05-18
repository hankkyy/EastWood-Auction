import type { NextApiRequest, NextApiResponse } from "next";
import type { Artwork } from "@/data/artworks";
import { artworks } from "@/data/artworks";
import {
  artworkToRow,
  isSupabaseConfigured,
  normalizeArtwork,
  rowToArtwork,
  type ArtworkRow,
} from "@/features/image-search/artworkCloud";
import { getSupabaseAdmin, getSupabaseBucket } from "@/lib/supabase/server";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "30mb",
    },
  },
};

const TABLE_NAME = "artworks";

const fallbackArtworks = () => artworks.map(normalizeArtwork);

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

      const { buffer, mimeType, extension } = parseDataUrl(imageUrl);
      const objectPath = `${artwork.listingType}/${artwork.id}/${Date.now()}-${index}.${extension}`;
      const { error } = await supabase.storage
        .from(bucket)
        .upload(objectPath, buffer, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) {
        throw new Error(error.message);
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
      return data.publicUrl;
    })
  );

  return {
    image: uploadedGallery[0] ?? artwork.image,
    galleryImages: uploadedGallery.length ? uploadedGallery : [artwork.image],
  };
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "GET") {
    if (!isSupabaseConfigured()) {
      return res.status(200).json({ artworks: fallbackArtworks(), mode: "local" });
    }

    try {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .order("updated_at", { ascending: false });

      if (error) {
        throw error;
      }

      return res.status(200).json({
        artworks: ((data ?? []) as ArtworkRow[]).map(rowToArtwork),
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

    try {
      const uploadedImages = await persistGalleryImages(normalizeArtwork(artwork));
      const supabase = getSupabaseAdmin();
      const row = artworkToRow({
        ...normalizeArtwork(artwork),
        image: uploadedImages.image,
        galleryImages: uploadedImages.galleryImages,
      });

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert(row)
        .select("*")
        .single();

      if (error) {
        throw error;
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
