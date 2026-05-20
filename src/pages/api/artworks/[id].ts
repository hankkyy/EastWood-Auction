import type { NextApiRequest, NextApiResponse } from "next";
import type { Artwork } from "@/data/artworks";
import {
  artworkToRow,
  isSupabaseConfigured,
  normalizeArtwork,
  rowToArtwork,
  type ArtworkRow,
} from "@/features/image-search/artworkCloud";
import { getSupabaseAdmin, getSupabaseBucket } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "30mb",
    },
  },
};

const TABLE_NAME = "artworks";
const isDataUrl = (value: string) => value.startsWith("data:");

const verifyUser = async (req: NextApiRequest) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { isAuthenticated: false, error: "Authorization required" };
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return { isAuthenticated: false, error: "Supabase not configured" };
  }

  const token = authHeader.substring(7);
  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error: authError,
  } = await supabaseClient.auth.getUser(token);

  if (authError || !user) {
    return { isAuthenticated: false, error: "Invalid token" };
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    isAuthenticated: true,
    userId: user.id,
    isAdmin: (profile as any)?.role === "admin",
  };
};

const canMutateArtwork = async (
  artworkId: string,
  userId?: string,
  isAdmin?: boolean
) => {
  if (isAdmin) {
    return true;
  }

  if (!userId) {
    return false;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("uploaded_by")
    .eq("id", artworkId)
    .single();

  if (error || !data) {
    return false;
  }

  return (data as any).uploaded_by === userId;
};

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
  const id = typeof req.query.id === "string" ? req.query.id : "";

  if (!id) {
    return res.status(400).json({ error: "Artwork id is required." });
  }

  if (!isSupabaseConfigured()) {
    return res.status(503).json({
      error: "Supabase is not configured. Add the required environment variables first.",
    });
  }

  if (req.method === "PATCH") {
    const artwork = req.body?.artwork as Artwork | undefined;

    if (!artwork) {
      return res.status(400).json({ error: "Artwork payload is required." });
    }

    try {
      const auth = await verifyUser(req);
      if (!auth.isAuthenticated) {
        return res.status(403).json({ error: auth.error || "Forbidden" });
      }

      const allowed = await canMutateArtwork(id, auth.userId, auth.isAdmin);
      if (!allowed) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const uploadedImages = await persistGalleryImages(normalizeArtwork(artwork));
      const supabase = getSupabaseAdmin();
      const row = artworkToRow({
        ...normalizeArtwork(artwork),
        id,
        image: uploadedImages.image,
        galleryImages: uploadedImages.galleryImages,
      });

      const { data, error } = await (supabase as any)
        .from(TABLE_NAME)
        .update(row)
        .eq("id", id)
        .select("*")
        .single();

      if (error) {
        throw error;
      }

      return res.status(200).json({ artwork: rowToArtwork(data as ArtworkRow) });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to update artwork.",
      });
    }
  }

  if (req.method === "DELETE") {
    try {
      const auth = await verifyUser(req);
      if (!auth.isAuthenticated) {
        return res.status(403).json({ error: auth.error || "Forbidden" });
      }

      const allowed = await canMutateArtwork(id, auth.userId, auth.isAdmin);
      if (!allowed) {
        return res.status(403).json({ error: "Forbidden" });
      }

      const supabase = getSupabaseAdmin();
      const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);

      if (error) {
        throw error;
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      return res.status(500).json({
        error: error instanceof Error ? error.message : "Unable to delete artwork.",
      });
    }
  }

  res.setHeader("Allow", ["PATCH", "DELETE"]);
  return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
}
