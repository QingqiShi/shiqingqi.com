import { z } from "zod";
import {
  newTrip,
  newTripSchema,
  type NewTrip,
} from "#src/trips/ops/new-trip.ts";
import { issueText } from "#src/trips/ops/refusal.ts";
import type { Trip } from "#src/trips/types.ts";
import { bindPlaceholders } from "./bind-placeholders.ts";
import { proveBatches, type ProposedBatch } from "./prove-batches.ts";

const proposalSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  batches: z.array(
    z.object({
      summary: z.string().trim().min(1).max(500),
      ops: z.array(z.looseObject({ op: z.string() })),
    }),
  ),
});

const draftSchema = proposalSchema.extend({ fields: newTripSchema });

/** The changes that the model proposes, which apply in order to the trip it was given. */
export interface Proposal {
  batches: ProposedBatch[];
  /** The model's short word to the person, in the language of the request. */
  message: string;
}

/** A new trip from pasted text: make it with `fields`, then apply the batches. */
export interface TripDraft extends Proposal {
  /** What `POST /api/trips` takes. */
  fields: NewTrip;
  /**
   * The ids of the days of the trip that the batches were proved on. The
   * ops name these days; a made trip has other ids, which `bindDraftDays`
   * puts in their place.
   */
  dayIds: string[];
}

export type Checked<T> = { ok: true; value: T } | { ok: false; reason: string };

/** A proposal for the trip from the model's text, or why it cannot apply. */
export function checkProposal(trip: Trip, text: string): Checked<Proposal> {
  const answer = readJson(text, proposalSchema);
  if (!answer.ok) return answer;
  const bound = bindPlaceholders(answer.value.batches);
  if (!bound.ok) return bound;
  const proof = proveBatches(trip, bound.batches);
  if (!proof.ok) return proof;
  return {
    ok: true,
    value: { batches: proof.batches, message: answer.value.message },
  };
}

/**
 * A draft from the model's text, or why it cannot apply. The model names the
 * days of the new trip `$day1`, `$day2` and on, and the draft proves the
 * batches on `newTrip(fields)`.
 */
export function checkDraft(text: string): Checked<TripDraft> {
  const answer = readJson(text, draftSchema);
  if (!answer.ok) return answer;
  const { fields, message } = answer.value;
  const skeleton = newTrip(fields);
  const known = new Map(
    skeleton.days.map((day, i) => [`$day${String(i + 1)}`, day.id]),
  );
  const bound = bindPlaceholders(answer.value.batches, known);
  if (!bound.ok) return bound;
  const proof = proveBatches(skeleton, bound.batches);
  if (!proof.ok) return proof;
  return {
    ok: true,
    value: {
      fields,
      dayIds: skeleton.days.map((day) => day.id),
      batches: proof.batches,
      message,
    },
  };
}

function readJson<T>(text: string, schema: z.ZodType<T>): Checked<T> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end < start) {
    return { ok: false, reason: "The answer has no JSON object." };
  }
  let value: unknown;
  try {
    value = JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    return {
      ok: false,
      reason: `The answer is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    return {
      ok: false,
      reason: `The answer does not have the right shape: ${issueText(parsed.error)}`,
    };
  }
  return { ok: true, value: parsed.data };
}
