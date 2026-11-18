import { after } from "next/server";
import "server-only";
import { getTripModel } from "#src/ai/get-trip-model.ts";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { makeAssistantRoutes } from "./make-assistant-routes.ts";

export const assistantRoutes = makeAssistantRoutes({
  getDb: getTripsDb,
  summaryModel: getTripModel,
  turnModel: () => undefined,
  afterResponse: (task) => {
    after(task);
  },
  now: () => new Date(),
});
