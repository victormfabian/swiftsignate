import "server-only";

const DEFAULT_SITE_URL = "https://swiftsignate.com";

export function getSiteUrl() {
  const rawValue =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    DEFAULT_SITE_URL;

  return rawValue.replace(/\/+$/, "");
}
