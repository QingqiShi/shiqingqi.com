import { safeNextPath } from "@tuja/server-auth/sign-in-path";

/** The page that the `next` search parameter asks for, without a locale, or the Desk at `/`. */
export function nextOf(requested: string | string[] | undefined): string {
  return safeNextPath(typeof requested === "string" ? requested : null);
}
