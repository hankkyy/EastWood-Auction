/**
 * 将需要代理的外部图片 URL 重写为本站代理地址。
 * 解决 images.metmuseum.org 等境外图片 CDN 在国内被墙的问题。
 */
export function proxyImageUrl(src: string | undefined | null): string {
  if (!src) return "";
  // 已经是本站资源，不需要代理
  if (src.startsWith("/") || src.startsWith("data:")) return src;
  // 已经是本站代理地址
  if (src.includes("/api/proxy-image")) return src;

  try {
    const host = new URL(src).hostname;
    // 需要代理的域名白名单
    const PROXY_HOSTS = ["images.metmuseum.org", "images.unsplash.com", "i.ebayimg.com"];
    if (PROXY_HOSTS.some((h) => host === h || host.endsWith("." + h))) {
      return `/api/proxy-image?url=${encodeURIComponent(src)}`;
    }
  } catch {
    // 非法 URL，原样返回
  }
  return src;
}
