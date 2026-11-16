import { isAllowedOrigin } from "@tuja/server-auth/is-allowed-origin";
import { BASE_URL } from "#src/constants.ts";

export function isAllowedBuddyOrigin(origin: string): boolean {
  return isAllowedOrigin(origin, [BASE_URL]);
}
