import { createHash } from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";

type EbayChallengeResponse = {
  challengeResponse: string;
};

const getVerificationToken = () =>
  process.env.EBAY_ACCOUNT_DELETION_VERIFICATION_TOKEN?.trim() ?? "";

const getConfiguredEndpoint = () =>
  process.env.EBAY_ACCOUNT_DELETION_ENDPOINT_URL?.trim().replace(/\/+$/, "") ?? "";

const getRequestEndpoint = (req: NextApiRequest) => {
  const configured = getConfiguredEndpoint();
  if (configured) {
    return configured;
  }

  const protocolHeader = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
  const hostHeader =
    (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ||
    (req.headers.host ?? "").trim();
  const protocol = protocolHeader || (hostHeader.includes("localhost") ? "http" : "https");

  return `${protocol}://${hostHeader}${req.url?.split("?")[0] ?? "/api/ebay/account-deletion"}`.replace(/\/+$/, "");
};

const buildChallengeResponse = (challengeCode: string, verificationToken: string, endpoint: string) =>
  createHash("sha256")
    .update(challengeCode + verificationToken + endpoint)
    .digest("hex");

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<EbayChallengeResponse | { ok: boolean; message?: string; error?: string }>
) {
  const verificationToken = getVerificationToken();
  const endpoint = getRequestEndpoint(req);

  if (!verificationToken) {
    return res.status(500).json({
      ok: false,
      error: "EBAY_ACCOUNT_DELETION_VERIFICATION_TOKEN is not configured.",
    });
  }

  if (req.method === "GET") {
    const challengeCode = `${req.query.challenge_code ?? ""}`.trim();

    if (!challengeCode) {
      return res.status(200).json({
        ok: true,
        message: "eBay account deletion endpoint is reachable.",
      });
    }

    return res.status(200).json({
      challengeResponse: buildChallengeResponse(challengeCode, verificationToken, endpoint),
    });
  }

  if (req.method === "POST") {
    console.log("[eBay Account Deletion] Notification received", {
      endpoint,
      body: req.body,
    });

    return res.status(200).json({ ok: true });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).json({
    ok: false,
    error: `Method ${req.method} Not Allowed`,
  });
}
