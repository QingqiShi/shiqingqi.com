import { isAllowedOrigin } from "@tuja/server-auth/is-allowed-origin";
import { ALLOWED_REFERER } from "#src/constants.ts";

export function isAllowedAssistantOrigin(origin: string): boolean {
  return isAllowedOrigin(origin, ALLOWED_REFERER);
}
