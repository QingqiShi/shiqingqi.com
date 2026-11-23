import { z } from "zod";
import { json, signedInRoute } from "#src/auth/signed-in-route.ts";
import { exchangeDate } from "#src/fund/market/exchange-date.ts";
import { sessionFor } from "#src/fund/meeting/session-for.ts";
import { startAndAdvance } from "#src/fund/meeting/start-and-advance.ts";

export const maxDuration = 800;

/** Starts the meeting of today's session in London, or continues it. */
export const POST = signedInRoute(z.object({}), async () =>
  json(
    await startAndAdvance({
      asOf: sessionFor(exchangeDate(new Date(), "Europe/London")),
    }),
  ),
);
