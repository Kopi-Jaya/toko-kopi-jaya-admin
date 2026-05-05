/**
 * Rewrites a backend image URL (any host) to go through the Next.js proxy.
 * Handles both the old HTTPS traefik.me URL and the new HTTP .local URL.
 *
 * https://...traefik.me/uploads/products/file.jpg → /api/proxy/uploads/products/file.jpg
 * http://toko-kopi-jaya-api.local/uploads/...     → /api/proxy/uploads/...
 */
export function toProxyImageUrl(imgUrl: string | null | undefined): string | null {
  if (!imgUrl) return null;
  try {
    const { pathname } = new URL(imgUrl);
    return `/api/proxy${pathname}`;
  } catch {
    return imgUrl;
  }
}
