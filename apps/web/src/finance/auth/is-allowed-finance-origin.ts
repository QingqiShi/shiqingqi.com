import { ALLOWED_REFERER } from "#src/constants.ts";

/**
 * True when a passkey ceremony may run at this origin: production, a Vercel
 * deployment of this project, http://localhost, or a dev host that Next allows.
 */
export function isAllowedFinanceOrigin(origin: string): boolean {
  let url: URL;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (url.protocol === "http:" && url.hostname === "localhost") return true;

  const vercelOrigins = [process.env.VERCEL_URL, process.env.VERCEL_BRANCH_URL]
    .filter((host): host is string => Boolean(host))
    .map((host) => `https://${host}`);
  if ([...ALLOWED_REFERER, ...vercelOrigins].includes(url.origin)) return true;

  const devHosts =
    process.env.ALLOWED_DEV_ORIGINS?.split(",").filter(Boolean) ?? [];
  return devHosts.includes(url.hostname);
}
