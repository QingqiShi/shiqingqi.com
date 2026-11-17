import { isAllowedOrigin } from "@tuja/server-auth/is-allowed-origin";
import { BASE_URL } from "#src/base-url.ts";

export function isAllowedTripsOrigin(origin: string): boolean {
  return isAllowedOrigin(origin, [BASE_URL]);
}
