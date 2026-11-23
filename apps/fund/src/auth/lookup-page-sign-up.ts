import "server-only";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { fundAuthStore } from "./fund-auth-store.ts";

/** The sign-up that a link's token opens, or null when the link has ended. */
export function lookupPageSignUp(token: string) {
  return fundAuthStore.lookupSignUp(getFundDb(), token, new Date());
}
