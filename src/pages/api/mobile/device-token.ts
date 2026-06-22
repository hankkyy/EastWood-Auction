import type { NextApiRequest, NextApiResponse } from "next";
import { verifySupabaseUser } from "@/lib/supabase/auth";
import { getSupabaseAdmin } from "@/lib/supabase/server";

type DeviceTokenPayload = {
  token?: string;
  installationId?: string;
  platform?: string;
  appVersion?: string;
};

const TABLE_NAME = "device_push_tokens";

const getRequiredSecret = () => process.env.MOBILE_APP_API_SECRET?.trim() ?? "";

const hasValidSecret = (req: NextApiRequest) => {
  const required = getRequiredSecret();
  if (!required) {
    return true;
  }

  const provided = (req.headers["x-eastwood-mobile-secret"] as string | undefined)?.trim() ?? "";
  return provided.length > 0 && provided === required;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  if (!hasValidSecret(req)) {
    return res.status(401).json({ error: "Invalid mobile secret." });
  }

  const auth = await verifySupabaseUser(req);
  if (!auth.ok) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { token, installationId, platform, appVersion } = req.body as DeviceTokenPayload;
  const normalizedToken = token?.trim() ?? "";
  const normalizedInstallId = installationId?.trim() ?? "";

  if (!normalizedToken || !normalizedInstallId) {
    return res.status(400).json({ error: "token and installationId are required." });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(TABLE_NAME).upsert(
    {
      token: normalizedToken,
      installation_id: normalizedInstallId,
      user_id: auth.userId,
      platform: platform?.trim() || "ios",
      app_version: appVersion?.trim() || null,
      last_seen_at: new Date().toISOString(),
    },
    {
      onConflict: "token",
    }
  );

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true });
}
