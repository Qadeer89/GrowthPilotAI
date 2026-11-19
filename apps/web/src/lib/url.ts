/**
 * Behind the Nginx reverse proxy, req.url reflects whatever Host header
 * Nginx forwards upstream -- which doesn't reliably match the public
 * domain. OAuth callback redirects must land on the public URL, so build
 * them from APP_BASE_URL instead of `new URL(path, req.url)`.
 */
export function appUrl(path: string): URL {
  const base = process.env.APP_BASE_URL ?? "http://localhost:3000";
  return new URL(path, base);
}
