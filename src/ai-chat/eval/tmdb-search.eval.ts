import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "Look up a movie by title",
    input: "Look up the movie Interstellar",
    criteria: [
      "Provides information about the 2014 film Interstellar directed by Christopher Nolan",
      "Mentions key details such as genre, plot summary, or cast",
    ],
    requireToolCall: "tmdb_search",
    deterministic: [
      { type: "min-length", value: 50, label: "Response is at least 50 chars" },
      {
        type: "not-contains",
        value: "http://",
        label: "No http:// URLs in response",
      },
      {
        type: "not-contains",
        value: "https://",
        label: "No https:// URLs in response",
      },
    ],
  },
  {
    name: "Look up a TV show by title",
    input: "Tell me about the TV show Breaking Bad",
    criteria: [
      "Provides information about the TV series Breaking Bad",
      "Mentions key details such as genre, plot summary, or cast",
    ],
    requireToolCall: "tmdb_search",
    deterministic: [
      { type: "min-length", value: 50, label: "Response is at least 50 chars" },
      {
        type: "not-contains",
        value: "http://",
        label: "No http:// URLs in response",
      },
      {
        type: "not-contains",
        value: "https://",
        label: "No https:// URLs in response",
      },
    ],
  },
  {
    name: "Look up a person by name",
    input: "Look up director Christopher Nolan",
    criteria: [
      "Identifies Christopher Nolan as a film director",
      "Mentions notable films he has directed",
    ],
    requireToolCall: "tmdb_search",
    deterministic: [
      { type: "min-length", value: 50, label: "Response is at least 50 chars" },
      {
        type: "not-contains",
        value: "http://",
        label: "No http:// URLs in response",
      },
      {
        type: "not-contains",
        value: "https://",
        label: "No https:// URLs in response",
      },
    ],
  },
];

describe("Title search", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runSingleTurnEval(evalCase);
  });
});
