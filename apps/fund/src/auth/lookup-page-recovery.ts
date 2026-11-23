import { lookupRecovery } from "@tuja/server-auth/lookup-recovery";
import "server-only";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { fundAuthConfig } from "./make-fund-auth.ts";

/** The recovery that a link's token opens, or null when the link has ended. */
export function lookupPageRecovery(token: string) {
  return lookupRecovery(fundAuthConfig, getFundDb(), token, new Date());
}
