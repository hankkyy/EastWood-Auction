import { getSupabaseAdmin, getSupabaseBucket } from "@/lib/supabase/server";

type ParsedDataUrl = {
  mimeType: string;
  extension: string;
  buffer: Buffer;
};

export const parseDataUrl = (value: string): ParsedDataUrl => {
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

export const uploadDataUrlToStorage = async (params: {
  dataUrl: string;
  objectPath: string;
}) => {
  const supabase = getSupabaseAdmin();
  const bucket = getSupabaseBucket();
  const { buffer, mimeType } = parseDataUrl(params.dataUrl);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(params.objectPath, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(params.objectPath);

  return {
    bucket,
    objectPath: params.objectPath,
    publicUrl: data.publicUrl,
  };
};
