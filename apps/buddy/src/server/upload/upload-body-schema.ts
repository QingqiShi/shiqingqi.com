import { z } from "zod";
import type {
  PetCounters,
  PetDay,
  PetGithub,
  PetGrowth,
  PetMerges,
  PetParty,
  PetQuota,
} from "#src/pet/types.ts";

const MAX_DAYS = 4000;
const MAX_SAMPLES = 2000;
const MAX_TIME_MS = 1e14;

const dayStringSchema = z
  .string()
  .regex(/^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/);
const timeSchema = z.int().min(0).max(MAX_TIME_MS);
const countSchema = z.int().min(0);
const pctSchema = z.number().min(0).max(1000);

export const petDaySchema = z.strictObject({
  day: dayStringSchema,
  tokens: countSchema,
  costUsd: z.number().min(0).max(1e7),
  cacheRead: countSchema.optional(),
  promptTokens: countSchema.optional(),
}) satisfies z.ZodType<PetDay>;

const petLimitSchema = z.strictObject({
  pct: pctSchema,
  resetsAt: timeSchema.nullable(),
});

const petQuotaSchema = z.strictObject({
  at: timeSchema.nullable(),
  five: petLimitSchema.nullable(),
  week: petLimitSchema.nullable(),
  samples: z
    .array(
      z.strictObject({
        at: timeSchema,
        five: pctSchema.optional(),
        week: pctSchema.optional(),
      }),
    )
    .max(MAX_SAMPLES),
}) satisfies z.ZodType<PetQuota>;

const petGithubSchema = z.strictObject({
  fetchedAt: timeSchema,
  total: countSchema,
  start: dayStringSchema,
  levels: z
    .string()
    .regex(/^[0-4]*$/)
    .max(MAX_DAYS),
}) satisfies z.ZodType<PetGithub>;

const petMergesSchema = z.strictObject({
  from: dayStringSchema,
  days: z
    .array(
      z.strictObject({
        day: dayStringSchema,
        prs: countSchema,
        additions: countSchema,
        deletions: countSchema,
      }),
    )
    .max(MAX_DAYS),
}) satisfies z.ZodType<PetMerges>;

const petPartySchema = z.strictObject({
  number: countSchema,
  until: timeSchema,
}) satisfies z.ZodType<PetParty>;

const levelUpSchema = z.strictObject({
  level: z.int().min(0).max(1000),
  until: timeSchema,
});

const petGrowthSchema = z.strictObject({
  highest: z.int().min(0).max(1000).nullable(),
  levelUp: levelUpSchema.nullable(),
}) satisfies z.ZodType<PetGrowth>;

const petCountersSchema = z.strictObject({
  fed: countSchema,
  patted: countSchema,
}) satisfies z.ZodType<PetCounters>;

/**
 * The body of `POST /api/v1/u/[user]/upload`. Every object is strict, so a
 * field that the page does not show, such as a PR title or a repository name,
 * can never reach the store.
 */
export const uploadBodySchema = z.strictObject({
  v: z.literal(1),
  at: timeSchema,
  tzOffsetMin: z.int().min(-720).max(840),
  firstDay: dayStringSchema.nullable(),
  days: z.array(petDaySchema).max(MAX_DAYS),
  quota: petQuotaSchema.nullable(),
  github: petGithubSchema.nullable(),
  merges: petMergesSchema.nullable(),
  party: petPartySchema.nullable(),
  growth: petGrowthSchema,
  pet: petCountersSchema,
});

export type UploadBody = z.infer<typeof uploadBodySchema>;
