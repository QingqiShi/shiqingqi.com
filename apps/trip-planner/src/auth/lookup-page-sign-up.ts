import "server-only";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { tripsAuthStore } from "./trips-auth-store.ts";

/** The sign-up that a link's token opens, or null when the link has ended. */
export function lookupPageSignUp(token: string) {
  return tripsAuthStore.lookupSignUp(getTripsDb(), token, new Date());
}
