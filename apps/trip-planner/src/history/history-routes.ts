import "server-only";
import { z } from "zod";
import { json, signedInRoute } from "#src/auth/signed-in-route.ts";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { tripHistory } from "./trip-history.ts";

const STATUS_CODES = {
  restored: 200,
  conflict: 409,
  refused: 422,
  not_found: 404,
} as const;

const revision = z.number().int().min(1);

const restoreVersion = signedInRoute(
  z.strictObject({
    tripId: z.uuid(),
    revision,
    /** The newest version when the person read the trip. */
    seen: z.strictObject({ revision, stamp: z.string().min(1) }),
  }),
  async (userId, { tripId, revision: from, seen }) => {
    const db = getTripsDb();
    const read = await tripHistory.read(db, userId, tripId, from);
    if (!read) return json({ status: "not_found" }, STATUS_CODES.not_found);
    // A version that this build cannot read would break the reader.
    if (!read.version.trip) {
      return json({ status: "refused" }, STATUS_CODES.refused);
    }
    const result = await tripHistory.restore(db, userId, tripId, seen, from);
    return json(result, STATUS_CODES[result.status]);
  },
);

export const historyRoutes = { restoreVersion };
