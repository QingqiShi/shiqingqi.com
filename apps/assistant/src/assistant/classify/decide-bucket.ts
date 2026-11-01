import type { MailBucket, SenderRuleBucket } from "#src/assistant/db/schema.ts";
import type { HeaderSignals } from "./read-header-rules.ts";
import type { Answer, MailFacts } from "./types.ts";

export interface BucketInput {
  facts: MailFacts;
  signals: HeaderSignals;
  /** The user has replied to this sender before. */
  knownCorrespondent: boolean;
  /** The confirmed sender rule for the sender: it overrides the facts. */
  senderRule: { bucket: SenderRuleBucket } | null;
}

export interface BucketDecision {
  bucket: MailBucket;
  /** The row of the table that chose the bucket. */
  reason: string;
}

/** An "unclear" answer to any of these makes the mail `unsure`. */
const KEY_FACTS = [
  "asksUserToAct",
  "marketing",
  "personal",
  "worthKnowing",
] as const satisfies readonly (keyof MailFacts)[];

function bucketOfFacts(facts: MailFacts): BucketDecision {
  for (const fact of KEY_FACTS) {
    if (facts[fact] === "unclear") {
      return { bucket: "unsure", reason: `unclear:${fact}` };
    }
  }
  if (facts.asksUserToAct === "yes" && facts.marketing === "no") {
    return { bucket: "act", reason: "act:asks-to-act" };
  }
  if (facts.marketing === "yes") {
    return { bucket: "filed", reason: "filed:marketing" };
  }
  if (facts.personal === "yes") {
    return { bucket: "fyi", reason: "fyi:personal" };
  }
  if (facts.worthKnowing === "yes") {
    return { bucket: "fyi", reason: "fyi:worth-knowing" };
  }
  return { bucket: "filed", reason: "filed:routine" };
}

/**
 * Maps the model's facts, the header signals and the sender rules to a
 * bucket. The safety nets ignore the model's answers: a security alert or a
 * one-time code is never filed, and mail from a sender the user has replied
 * to is never filed unless a sender rule says so.
 */
export function decideBucket(input: BucketInput): BucketDecision {
  const { signals, knownCorrespondent, senderRule } = input;
  // Mail to a list, or made by a machine, was not written to the user.
  const personal: Answer =
    signals.bulk || signals.automated ? "no" : input.facts.personal;
  const facts = { ...input.facts, personal };

  const decision: BucketDecision = senderRule
    ? { bucket: senderRule.bucket, reason: "sender-rule" }
    : bucketOfFacts(facts);
  if (decision.bucket !== "filed") return decision;

  if (signals.securityAlert || facts.securityAlert === "yes") {
    return { bucket: "fyi", reason: "safety:security-alert" };
  }
  if (signals.oneTimeCode || facts.oneTimeCode === "yes") {
    return { bucket: "fyi", reason: "safety:one-time-code" };
  }
  if (senderRule) return decision;
  if (knownCorrespondent) {
    return { bucket: "fyi", reason: "safety:replied-before" };
  }
  // Filing needs a category: when the model cannot choose one, the user does.
  if (facts.category === "unclear") {
    return { bucket: "unsure", reason: "unclear:category" };
  }
  return decision;
}
