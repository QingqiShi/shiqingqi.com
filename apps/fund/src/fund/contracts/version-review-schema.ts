import { z } from "zod";

/**
 * The daily review of a document that the fund keeps in versions: the fund
 * thesis (by the PM) or the risk policy (by the risk officer). The default is
 * `keep`; a revision names the evidence that changed and gives the full new
 * text.
 */
export function versionReviewSchema<T extends z.ZodType>(body: T) {
  return z.object({
    verdict: z
      .enum(["keep", "revise"])
      .describe(
        "keep unless today's information changes it; revise only when you can name the evidence that changed.",
      ),
    evidence: z
      .string()
      .describe(
        "For keep: one sentence on why today's information does not change it. For revise: the facts that changed.",
      ),
    revised: body
      .nullable()
      .describe("For revise: the full new text. Null for keep."),
    changeNote: z
      .string()
      .nullable()
      .describe("For revise: what changed and why. Null for keep."),
  });
}

/** The same review when no version exists yet: the answer must write the first one. */
export function firstVersionSchema<T extends z.ZodType>(body: T) {
  return z.object({
    verdict: z
      .literal("revise")
      .describe("There is no earlier version: write the first one."),
    evidence: z
      .string()
      .describe("What today's information says about how to set it up."),
    revised: body.describe("The full first version."),
    changeNote: z.null().describe("Null: there is no earlier version."),
  });
}

export interface VersionReview<T> {
  verdict: "keep" | "revise";
  evidence: string;
  revised: T | null;
  changeNote: string | null;
}
