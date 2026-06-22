import type { NextApiRequest, NextApiResponse } from "next";

/**
 * POST /api/translate
 *
 * Translates English text to Chinese using Google's translate_a/single endpoint.
 * Falls back to MyMemory if Google is unavailable.
 *
 * Body: { texts: string[] } — max 30 texts, each ≤ 500 chars
 * Response: { translations: Record<string, string> }
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { texts } = req.body as { texts?: string[] };

  if (!texts || !Array.isArray(texts) || texts.length === 0) {
    return res.status(400).json({ error: "texts array is required" });
  }

  if (texts.length > 30) {
    return res.status(400).json({ error: "max 30 texts per request" });
  }

  const validTexts = texts
    .filter((t) => typeof t === "string" && t.trim().length > 0)
    .slice(0, 30);

  if (validTexts.length === 0) {
    return res.json({ translations: {} });
  }

  const translations: Record<string, string> = {};

  // Try Google first (faster, better quality)
  for (const text of validTexts) {
    const translated = await translateGoogle(text) ?? await translateMyMemory(text);
    if (translated) {
      translations[text] = translated;
    }
  }

  return res.json({ translations });
}

async function translateGoogle(text: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-CN&dt=t&q=${encodeURIComponent(text)}`;
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const raw = await resp.text();

    // Google returns nested arrays: [[["translated","original",...]],...]
    // Parse manually to avoid json quirks
    const pieces: string[] = [];
    const matches = raw.matchAll(/\[\[\["(.*?)"/g);
    for (const m of matches) {
      if (m[1]) pieces.push(m[1]);
    }

    const result = pieces.join("");
    return result || null;
  } catch {
    return null;
  }
}

async function translateMyMemory(text: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|zh-CN`;
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const data = await resp.json();
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }
    return null;
  } catch {
    return null;
  }
}
