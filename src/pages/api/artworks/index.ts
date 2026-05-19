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
import { createClient } from "@supabase/supabase-js";
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
      
      const uniqueUsername = `user_${user.id.substring(0, 8)}`;
      
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          username: uniqueUsername,
          role: 'user',
          display_name: user.email?.split('@')[0] || 'User',
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

  console.log('[API] persistGalleryImages - Processing artwork:', {
    id: artwork.id,
    title: artwork.title,
    listingType: artwork.listingType,
    imageCount: sourceGallery.length,
    firstImagePreview: sourceGallery[0]?.substring(0, 100) + '...'
  });

  const uploadedGallery = await Promise.all(
    sourceGallery.map(async (imageUrl, index) => {
      console.log(`[API] Processing image ${index}:`, {
        isDataUrl: isDataUrl(imageUrl),
        preview: imageUrl.substring(0, 50) + '...'
      });

      if (!isDataUrl(imageUrl)) {
        console.log(`[API] Image ${index} is not a Data URL, returning as-is`);
        return imageUrl;
      }

      try {
        const { buffer, mimeType, extension } = parseDataUrl(imageUrl);
        console.log(`[API] Parsed image ${index}:`, {
          bufferSize: buffer.length,
          mimeType,
          extension
        });

        const objectPath = `${artwork.listingType}/${artwork.id}/${Date.now()}-${index}.${extension}`;
        console.log(`[API] Uploading image ${index} to:`, objectPath);

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

        console.log(`[API] Successfully uploaded image ${index}`);

        const { data } = supabase.storage.from(bucket).getPublicUrl(objectPath);
        console.log(`[API] Public URL for image ${index}:`, data.publicUrl);
        return data.publicUrl;
      } catch (error) {
        console.error(`[API] Error processing image ${index}:`, error);
        throw error;
      }
    })
  );

  console.log('[API] All images processed successfully');

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
      
      // ✅ 先查询所有 artworks
      const { data: artworksData, error: artworksError } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .order("updated_at", { ascending: false });

      if (artworksError) {
        throw artworksError;
      }

      // ✅ 获取所有唯一的上传者 ID
      const uploaderIds = Array.from(new Set(
        (artworksData ?? [])
          .map((row: any) => row.uploaded_by)
          .filter(Boolean)
      ));

      // ✅ 批量查询上传者信息
      let uploaderMap: Record<string, string> = {};
      if (uploaderIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, user_id")
          .in("id", uploaderIds);
        
        if (profilesData && profilesData.length > 0) {
          uploaderMap = profilesData.reduce((acc: Record<string, string>, profile: any) => {
            acc[profile.id] = profile.user_id;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      // ✅ 将 uploaderName 添加到每个 artwork
      const artworksWithUploader = ((artworksData ?? []) as any[]).map((row) => {
        const artwork = rowToArtwork(row);
        
        // 如果有上传者且找到了对应的 user_id，添加 uploaderName 字段
        if (row.uploaded_by && uploaderMap[row.uploaded_by]) {
          (artwork as any).uploaderName = uploaderMap[row.uploaded_by];
        }
        
        return artwork;
      });

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
      const uploadedImages = await persistGalleryImages(normalizeArtwork(artwork));
      const supabase = getSupabaseAdmin();
      
      // ✅ 管理员上传的案例设置为官方内容
      const artworkWithOfficial = {
        ...normalizeArtwork(artwork),
        image: uploadedImages.image,
        galleryImages: uploadedImages.galleryImages,
        isOfficial: isAdmin || false, // 管理员上传的设置为 true
        uploadedBy: userId, // 记录上传者ID
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
