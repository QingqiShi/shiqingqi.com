import { safeNextPath } from "@tuja/server-auth/sign-in-path";

/**
 * Where a visitor goes after sign-in, sign-up or recovery when no page asked
 * for the sign-in: the sign-in page, which sends a signed-in account to its pet.
 */
export const SIGNED_IN_HOME = "/sign-in";

/** The page that the `next` search parameter asks for, without a locale, or `SIGNED_IN_HOME`. */
export function nextOf(requested: string | string[] | undefined): string {
  return typeof requested === "string"
    ? safeNextPath(requested)
    : SIGNED_IN_HOME;
}
