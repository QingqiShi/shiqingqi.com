import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { accumulateToolOutputs } from "./accumulate-tool-outputs";

function msg(
  parts: UIMessage["parts"],
  role: "user" | "assistant" = "assistant",
): UIMessage {
  return { id: `msg-${String(Math.random())}`, role, parts };
}

function toolPart(toolName: string, output: unknown) {
  return {
    type: "dynamic-tool" as const,
    toolName,
    toolCallId: `call-${String(Math.random())}`,
    state: "output-available" as const,
    input: {},
    output,
  };
}

describe("accumulateToolOutputs", () => {
  it("accumulates search results from tmdb_search across messages", () => {
    const messages = [
      msg([
        toolPart("tmdb_search", [
          {
            id: 1,
            media_type: "movie",
            title: "Inception",
            poster_path: "/a.jpg",
            vote_average: 8.4,
          },
        ]),
      ]),
      msg([
        toolPart("tmdb_search", [
          {
            id: 2,
            media_type: "tv",
            title: "Dark",
            poster_path: "/b.jpg",
            vote_average: 8.8,
          },
        ]),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.searchResultsMap.size).toBe(2);
    expect(result.searchResultsMap.get("movie:1")?.title).toBe("Inception");
    expect(result.searchResultsMap.get("tv:2")?.title).toBe("Dark");
  });

  it("skips tool parts that are not output-available", () => {
    const messages = [
      msg([
        {
          type: "dynamic-tool" as const,
          toolName: "tmdb_search",
          toolCallId: "call-1",
          state: "input-available" as const,
          input: { query: "test" },
        },
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.searchResultsMap.size).toBe(0);
  });
});
