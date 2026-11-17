import { lookupRecovery } from "@tuja/server-auth/lookup-recovery";
import "server-only";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { tripsAuthConfig } from "./make-trips-auth.ts";

/** The recovery that a link's token opens, or null when the link has ended. */
export function lookupPageRecovery(token: string) {
  return lookupRecovery(tripsAuthConfig, getTripsDb(), token, new Date());
}
