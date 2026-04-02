import { describe, it } from "vitest";
import { runSingleTurnEval } from "./run-eval";
import type { EvalCase } from "./types";

const cases: EvalCase[] = [
  {
    name: "Web search for recent award results",
    input: "Who won Best Picture at the Oscars this year?",
    criteria: [
      "Mentions a specific movie as the Best Picture winner",
      "Cites a source by name (e.g. a publication or organization)",
    ],
    requireToolCall: "web_search",
    deterministic: [
      { type: "min-length", value: 30, label: "Response is at least 30 chars" },
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
    name: "Web search for release date news",
    input: "When does the next season of Stranger Things come out?",
    criteria: [
      "Provides information about an upcoming season of Stranger Things",
      "Cites a source by name or references recent reporting",
    ],
    requireToolCall: "web_search",
    deterministic: [
      { type: "min-length", value: 30, label: "Response is at least 30 chars" },
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
    name: "Does NOT web search for standard movie lookup",
    input: "Tell me about Inception",
    criteria: [
      "Provides information about the 2010 film Inception directed by Christopher Nolan",
    ],
    requireToolCall: "tmdb_search",
    forbidToolCall: "web_search",
  },
  {
    name: "Does NOT web search for recommendations",
    input: "Recommend sci-fi movies like Arrival",
    criteria: ["Recommends multiple sci-fi movies similar to Arrival"],
    requireToolCall: "semantic_search",
    forbidToolCall: "web_search",
  },
];

describe("Web search", () => {
  it.each(cases)("$name", async (evalCase) => {
    await runSingleTurnEval(evalCase);
  });
});
