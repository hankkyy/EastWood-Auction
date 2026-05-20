import type { NextApiRequest, NextApiResponse } from "next";
import type { Artwork } from "@/data/artworks";
import {
  artworkToRow,
  isSupabaseConfigured,
  normalizeArtwork,
  type ArtworkRow,
} from "@/features/image-search/artworkCloud";
import { fetchKnowledgeBaseServer } from "@/features/image-search/artworkServer";
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

// ✅ 验证用户权限（返回用户信息，包含角色）
const verifyUser = async (req: NextApiRequest) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.warn('[API] No authorization header provided');
    return { isAuthenticated: false, error: "Authorization required" };
  }

  const token = authHeader.substring(7);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('[API] Supabase not configured');
    return { isAuthenticated: false, error: "Supabase not configured" };
  }

  try {
    console.log('[API] Verifying user token...');
    
    // 使用匿名密钥验证用户身份
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError) {
      console.error('[API] Auth verification failed:', authError.message);
      return { isAuthenticated: false, error: "Invalid token" };
    }

    if (!user) {
      console.error('[API] No user found in token');
      return { isAuthenticated: false, error: "Invalid token" };
    }

    console.log('[API] User authenticated:', user.id);

    // 使用服务角色密钥查询用户角色
    const supabaseAdmin = getSupabaseAdmin();
    
    let { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    // 如果 profile 不存在，自动创建一个默认 user 角色的 profile
    if (profileError || !profile) {
      console.log(`[API] Profile not found for user ${user.id}, creating default profile...`);
      
      const lastName = user.email?.split('@')[0] || 'User';
      const baseUserId = lastName.toLowerCase().replace(/[^a-z]/g, '');
      const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      const tempUserId = (baseUserId || 'user') + randomNum;
      
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          email: user.email,
          role: 'user',
          first_name: '',
          last_name: lastName,
          user_id: tempUserId,
        } as any)
        .select("role")
        .single();

      if (createError || !newProfile) {
        console.error('[API] Failed to create profile:', createError);
        return { isAuthenticated: false, error: "Failed to create user profile" };
      }

      profile = newProfile as any;
      console.log(`[API] Created default profile for user ${user.id} with role: ${(profile as any)?.role}`);
    }

    console.log('[API] User verification successful, role:', (profile as any)?.role);
    
    return { 
      isAuthenticated: true, 
      userId: user.id,
      isAdmin: (profile as any)?.role === "admin",
      role: (profile as any)?.role
    };
  } catch (error) {
    console.error('[API] Authentication error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { isAuthenticated: false, error: `Authentication failed: ${errorMessage}` };
  }
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
    const { isAuthenticated, userId, isAdmin, error: authError } = await verifyUser(req);
    if (!isAuthenticated) {
      return res.status(403).json({ error: authError || "Forbidden" });
    }

    try {
      const sanitizedArtwork = sanitizeArtworkForCreate(artwork, Boolean(isAdmin), userId);
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
