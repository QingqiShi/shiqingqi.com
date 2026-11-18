import { after } from "next/server";
import "server-only";
import { z } from "zod";
import { json, signedInRoute } from "#src/auth/signed-in-route.ts";
import { getTripsDb } from "#src/db/get-trips-db.ts";
import { dateInZone } from "#src/reader/resolve-day.ts";
import { canEditTrip } from "#src/trips/can-edit-trip.ts";
import { readTrips } from "#src/trips/read-trips.ts";
import { entityId, isTimeZone } from "#src/trips/trip-schema.ts";
import { askModel, emptyUse, type Ask, type Outcome } from "./ask-model.ts";
import {
  checkProposal,
  draftCheck,
  type NotAPlan,
  type Proposal,
  type TripDraft,
} from "./check-proposal.ts";
import { getTripModel, TRIP_MODEL_ID } from "./get-trip-model.ts";
import { logAiRun, type AiRun } from "./log-ai-run.ts";
import { tripPrompts } from "./trip-prompts.ts";

/** The longest a change waits for the model, under the `maxDuration` of its route. */
export const PROPOSE_DEADLINE_MS = 100_000;
/** The longest a draft waits for the model, under the `maxDuration` of its route. */
export const DRAFT_DEADLINE_MS = 270_000;

const proposeBody = z.strictObject({
  tripId: z.uuid(),
  prompt: z.string().trim().min(1).max(4000),
  dayId: entityId.optional(),
});

const draftBody = z.strictObject({
  text: z.string().trim().min(1).max(50_000),
  timeZone: z.string().refine(isTimeZone),
  locale: z.enum(["en", "zh"]),
});

/**
 * Runs one ask of the user, and logs its counts also when it fails. The
 * deadline and the client that goes away stop it.
 */
async function run<T>(
  userId: string,
  request: Request,
  log: Pick<AiRun, "tripId" | "kind">,
  deadlineMs: number,
  ask: Omit<Ask<T>, "signal" | "use">,
  answer: (value: T) => Response = json,
): Promise<Response> {
  const deadline = AbortSignal.timeout(deadlineMs);
  const signal = AbortSignal.any([request.signal, deadline]);
  const use = emptyUse();
  const started = performance.now();
  let status: AiRun["status"] = "failed";
  let outcome: Outcome<T>;
  try {
    outcome = await askModel({ ...ask, signal, use });
    status =
      outcome.status === "aborted" && deadline.aborted
        ? "timeout"
        : outcome.status;
  } finally {
    const run: AiRun = {
      ...log,
      model: TRIP_MODEL_ID,
      status,
      use,
      durationMs: performance.now() - started,
    };
    after(async () => {
      try {
        await logAiRun(getTripsDb(), userId, run);
      } catch (error) {
        console.error("The AI run log failed", error);
      }
    });
  }
  switch (outcome.status) {
    case "ok":
      return answer(outcome.value);
    case "invalid":
      return json({ error: "model_failed", reason: outcome.reason }, 502);
    case "failed":
      console.error("The model request failed", outcome.reason);
      return json(
        { error: "model_failed", reason: "The model did not answer." },
        502,
      );
    case "aborted":
      return status === "timeout"
        ? json(
            {
              error: "model_failed",
              reason: "The model took too long to answer.",
            },
            504,
          )
        : json({ error: "aborted" }, 499);
  }
}

/** Proposes changes to a trip that the user can edit. It saves nothing. */
const propose = signedInRoute(
  proposeBody,
  async (userId, { tripId, prompt, dayId }, request) => {
    const viewed = (await readTrips(getTripsDb(), userId)).find(
      (each) => each.id === tripId,
    );
    if (!viewed || !canEditTrip(viewed.role)) {
      return json({ error: "not_found" }, 404);
    }
    const model = getTripModel();
    if (!model) return json({ error: "not_configured" }, 503);
    const { trip } = viewed;
    return run<Proposal>(
      userId,
      request,
      { tripId, kind: "edit" },
      PROPOSE_DEADLINE_MS,
      {
        model,
        instructions: tripPrompts.propose.instructions,
        message: tripPrompts.propose.message(trip, prompt, new Date(), dayId),
        check: (text) => checkProposal(trip, text),
        maxOutputTokens: 16_000,
      },
    );
  },
);

/**
 * Drafts a new trip from pasted text. It makes no trip. Text that is not a
 * travel plan gets 422 with the model's sentence to the person.
 */
const draft = signedInRoute(
  draftBody,
  async (userId, { text, timeZone, locale }, request) => {
    const model = getTripModel();
    if (!model) return json({ error: "not_configured" }, 503);
    const now = new Date();
    return run<TripDraft | NotAPlan>(
      userId,
      request,
      { tripId: null, kind: "draft" },
      DRAFT_DEADLINE_MS,
      {
        model,
        instructions: tripPrompts.draft.instructions,
        message: tripPrompts.draft.message(text, now, timeZone, locale),
        check: draftCheck({ text, today: dateInZone(now, timeZone) }),
        maxOutputTokens: 48_000,
      },
      (value) =>
        "notAPlan" in value
          ? json({ error: "not_a_plan", message: value.notAPlan }, 422)
          : json(value),
    );
  },
);

export const aiRoutes = { propose, draft };
