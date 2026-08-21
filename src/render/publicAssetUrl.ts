export function publicAssetUrl(path: string): string {
  if (typeof window === "undefined") return path;
  const baseUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  return new URL(path.replace(/^\/+/, ""), baseUrl).href;
}
