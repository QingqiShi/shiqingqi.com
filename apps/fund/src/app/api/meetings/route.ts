import { z } from "zod";
import { json, signedInRoute } from "#src/auth/signed-in-route.ts";
import { exchangeDate } from "#src/fund/market/exchange-date.ts";
import { sessionFor } from "#src/fund/meeting/session-for.ts";
import { startAndAdvance } from "#src/fund/meeting/start-and-advance.ts";

export const maxDuration = 800;

const bodySchema = z.object({ kind: z.enum(["strategy", "daily"]) });

/** Starts the meeting of `kind` for today's session in London, or continues it. */
export const POST = signedInRoute(bodySchema, async ({ kind }) =>
  json(
    await startAndAdvance({
      kind,
      asOf: sessionFor(exchangeDate(new Date(), "Europe/London")),
    }),
  ),
);
