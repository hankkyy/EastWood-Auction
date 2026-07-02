import type { NextApiRequest, NextApiResponse } from "next";

// 仅代理白名单内的域名，防止被滥用
const ALLOWED_HOSTS = [
  "images.metmuseum.org",
  "images.unsplash.com",
  "i.ebayimg.com",
];

const cache = new Map<string, { data: Buffer; contentType: string; ts: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  // 解码 URL
  let decoded: string;
  try {
    decoded = decodeURIComponent(url);
  } catch {
    res.status(400).json({ error: "Invalid url encoding" });
    return;
  }

  // 验证白名单
  let host: string;
  try {
    host = new URL(decoded).hostname;
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
    res.status(403).json({ error: "Host not allowed" });
    return;
  }

  // 检查缓存
  const cached = cache.get(decoded);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    res.setHeader("Content-Type", cached.contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.setHeader("X-Proxy-Cache", "HIT");
    res.send(cached.data);
    return;
  }

  // 抓取远程图片
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(decoded, {
      signal: controller.signal,
      headers: { "User-Agent": "EastwoodAuction/1.0" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(response.status).json({ error: `Upstream error: ${response.status}` });
      return;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());

    // 写入缓存
    cache.set(decoded, { data: buffer, contentType, ts: Date.now() });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400, immutable");
    res.setHeader("X-Proxy-Cache", "MISS");
    res.send(buffer);
  } catch (err: any) {
    if (err.name === "AbortError") {
      res.status(504).json({ error: "Upstream timeout" });
    } else {
      res.status(502).json({ error: "Failed to fetch image" });
    }
  }
}
