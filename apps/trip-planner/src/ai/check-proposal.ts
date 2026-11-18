import { z } from "zod";
import { addDays } from "#src/trips/ops/add-days.ts";
import {
  newTrip,
  newTripSchema,
  type NewTrip,
} from "#src/trips/ops/new-trip.ts";
import type { DraftOp, Op } from "#src/trips/ops/op-schema.ts";
import { issueText } from "#src/trips/ops/refusal.ts";
import type { Trip } from "#src/trips/types.ts";
import { bindPlaceholders } from "./bind-placeholders.ts";
import { proveBatches } from "./prove-batches.ts";

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

interface BatchOf<T> {
  /** The days that the batch adds, changes or removes, in the order of the trip. */
  dayIds: string[];
  summary: string;
  ops: T[];
}

/**
 * A change to a trip that exists, which applies whole. Each op on a thing
 * that exists carries `expect`, the digest of that thing in the trip that
 * the model read, with the batches before this one. Check a batch with
 * `applyOps` on these digests, and do not make them again from a newer
 * trip: the batch then does not apply to a thing that changed since.
 */
export type ProposedBatch = BatchOf<Op>;

/** A change to a new trip. Its ops carry no `expect`: the trip that takes them is not made yet. */
export type DraftBatch = BatchOf<DraftOp>;

/** The changes that the model proposes, which apply in order to the trip it was given. */
export interface Proposal {
  batches: ProposedBatch[];
  /** The model's short word to the person, in the language of the request. */
  message: string;
}

/** A new trip from pasted text: make it with `fields`, then apply the batches. */
export interface TripDraft {
  batches: DraftBatch[];
  /** The model's short word to the person, in the person's language. */
  message: string;
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
    value: {
      batches: proof.batches.map(({ dayIds, summary, sent }) => ({
        dayIds,
        summary,
        ops: sent,
      })),
      message: answer.value.message,
    },
  };
}

/** The model's answer when the pasted text is not a travel plan: its sentence to the person. */
export interface NotAPlan {
  notAPlan: string;
}

const notAPlanSchema = z.strictObject({
  notAPlan: z.string().trim().min(1).max(500),
});

/** What the person pasted, and today's date where they are, as `YYYY-MM-DD`. */
export interface Pasted {
  text: string;
  today: string;
}

const YEAR_IN_DIGITS = /(?<!\d)(19|20)\d{2}(?!\d)/;

/**
 * The check of each answer to one draft ask. A trip that ends before today,
 * from a text that gives no year in digits, most likely has the wrong year,
 * so the first such answer goes back to the model once with that reason. The
 * model's next choice stands, as a text can tell of a trip that is over.
 */
export function draftCheck(
  pasted: Pasted,
): (text: string) => Checked<TripDraft | NotAPlan> {
  let askedYear = YEAR_IN_DIGITS.test(pasted.text);
  return (text) => {
    const checked = checkDraft(text);
    if (askedYear || !checked.ok || "notAPlan" in checked.value) {
      return checked;
    }
    const { fields } = checked.value;
    const lastDate = addDays(fields.firstDate, fields.days - 1);
    if (lastDate >= pasted.today) return checked;
    askedYear = true;
    return {
      ok: false,
      reason: `The trip ends on ${lastDate}, before today (${pasted.today}), and the pasted text gives no year in digits. Take the next such dates from today. Keep dates before today only when the text says that the trip is over, such as "last April" (the April before today) or "去年" (the year before this one). Say in "message" which year you chose.`,
    };
  };
}

/**
 * A draft from the model's text, or the model's word that the text is not a
 * plan, or why it cannot apply. The model names the days of the new trip
 * `$day1`, `$day2` and on, and the draft proves the batches on
 * `newTrip(fields)`.
 */
export function checkDraft(text: string): Checked<TripDraft | NotAPlan> {
  const declined = readJson(text, notAPlanSchema);
  if (declined.ok) return declined;
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
      batches: proof.batches.map(({ dayIds, summary, ops }) => ({
        dayIds,
        summary,
        ops,
      })),
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
