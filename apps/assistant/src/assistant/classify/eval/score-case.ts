import type { Classification } from "../classify-mail.ts";
import type { EvalCase, ExpectedEvent } from "./classify-fixtures.ts";

export interface CaseScore {
  name: string;
  bucket: boolean;
  /** Null when the case does not score it. */
  category: boolean | null;
  event: boolean | null;
  /** Null when the model wrote no summary. */
  language: boolean | null;
  got: string;
}

function eventMatches(
  expected: ExpectedEvent,
  event: Classification["event"],
): boolean {
  if (!event) return expected.optional === true;
  return (
    (expected.kind === undefined || event.kind === expected.kind) &&
    (expected.change === undefined || event.change === expected.change) &&
    (expected.certainty === undefined ||
      event.certainty === expected.certainty) &&
    (expected.start === undefined || event.start.startsWith(expected.start))
  );
}

const HAN = /\p{Script=Han}/u;

export function scoreCase(
  evalCase: EvalCase,
  result: Classification,
  categoryNameOf: (id: string | null) => string | null,
  locale: "en" | "zh",
): CaseScore {
  const category = categoryNameOf(result.categoryId);
  const { event } = evalCase;
  return {
    name: evalCase.name,
    bucket: evalCase.buckets.includes(result.bucket),
    category: evalCase.categories
      ? evalCase.categories.includes(category)
      : null,
    event:
      event === "any"
        ? null
        : event === null
          ? result.event === null
          : eventMatches(event, result.event),
    language:
      result.summary === null
        ? null
        : HAN.test(result.summary) === (locale === "zh"),
    got: [
      result.bucket,
      category ?? "-",
      result.reason,
      result.event
        ? `${result.event.kind}/${result.event.change} ${result.event.start} ${result.event.timeZone} ${result.event.certainty}`
        : "no event",
      result.summary ?? "",
    ].join(" | "),
  };
}

function rate(
  scores: readonly CaseScore[],
  key: "bucket" | "category" | "event" | "language",
) {
  const scored = scores.filter((score) => score[key] !== null);
  const right = scored.filter((score) => score[key] === true).length;
  return `${key} ${String(right)}/${String(scored.length)}`;
}

/** One line per case that missed, then the rates. */
export function reportScores(title: string, scores: readonly CaseScore[]) {
  const misses = scores
    .filter((score) =>
      [score.bucket, score.category, score.event, score.language].includes(
        false,
      ),
    )
    .map((score) => `  ✗ ${score.name}: ${score.got}`);
  return [
    `${title}: ${(["bucket", "category", "event", "language"] as const)
      .map((key) => rate(scores, key))
      .join(", ")}`,
    ...misses,
  ].join("\n");
}
