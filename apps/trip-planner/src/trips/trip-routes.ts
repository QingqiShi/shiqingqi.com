import "server-only";
import { z } from "zod";
import { json, signedInRoute } from "#src/auth/signed-in-route.ts";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { newTripSchema } from "./ops/new-trip.ts";
import { opSchema } from "./ops/op-schema.ts";
import { writeTrips } from "./write-trips.ts";

const STATUS_CODES = {
  applied: 200,
  conflict: 409,
  refused: 422,
  not_found: 404,
} as const;

const createTrip = signedInRoute(newTripSchema, async (userId, input) => {
  const tripId = await writeTrips.create(getTripsDb(), userId, input);
  return json({ tripId }, 201);
});

const changeTrip = signedInRoute(
  z.object({ tripId: z.uuid(), ops: z.array(z.unknown()).min(1) }),
  async (userId, { tripId, ops }) => {
    const parsed = z.array(opSchema).safeParse(ops);
    if (!parsed.success) {
      const [issue] = parsed.error.issues;
      const [index, ...path] = issue.path;
      return json(
        {
          status: "refused",
          index,
          reason:
            path.length > 0
              ? `${path.join(".")}: ${issue.message}`
              : issue.message,
        },
        STATUS_CODES.refused,
      );
    }
    const result = await writeTrips.change(
      getTripsDb(),
      userId,
      tripId,
      parsed.data,
    );
    return json(result, STATUS_CODES[result.status]);
  },
);

const deleteTrip = signedInRoute(
  z.object({ tripId: z.uuid() }),
  async (userId, { tripId }) => {
    const deleted = await writeTrips.remove(getTripsDb(), userId, tripId);
    return deleted
      ? json({ ok: true })
      : json({ error: "not_found" }, STATUS_CODES.not_found);
  },
);

export const tripRoutes = { createTrip, changeTrip, deleteTrip };
