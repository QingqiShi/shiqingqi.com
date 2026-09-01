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
  it("returns empty maps for no messages", () => {
    const result = accumulateToolOutputs([]);
    expect(result.searchResultsMap.size).toBe(0);
    expect(result.personResultsMap.size).toBe(0);
    expect(result.watchProvidersMap.size).toBe(0);
  });

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

  it("accumulates person results from tmdb_search", () => {
    const messages = [
      msg([
        toolPart("tmdb_search", [
          {
            id: 10,
            media_type: "person",
            name: "Nolan",
            profile_path: "/nolan.jpg",
            known_for_department: "Directing",
          },
        ]),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.personResultsMap.size).toBe(1);
    expect(result.personResultsMap.get(10)?.name).toBe("Nolan");
  });

  it("accumulates watch providers", () => {
    const messages = [
      msg([
        toolPart("watch_providers", {
          id: 550,
          mediaType: "movie",
          region: "US",
          providers: {
            link: null,
            flatrate: [{ id: 8, name: "Netflix", logoPath: "/n.jpg" }],
            rent: [],
            buy: [],
            ads: [],
            free: [],
          },
        }),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.watchProvidersMap.size).toBe(1);
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

  it("skips non-tool parts", () => {
    const messages = [
      msg([
        { type: "text" as const, text: "Hello" },
        toolPart("tmdb_search", [
          {
            id: 1,
            media_type: "movie",
            title: "X",
            poster_path: "/x.jpg",
            vote_average: 7,
          },
        ]),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.searchResultsMap.size).toBe(1);
  });

  it("does not call buildWatchProvidersMap for non-watch_providers tools", () => {
    const messages = [
      msg([
        toolPart("tmdb_search", [
          {
            id: 1,
            media_type: "movie",
            title: "X",
            poster_path: null,
            vote_average: 5,
          },
        ]),
      ]),
    ];

    const result = accumulateToolOutputs(messages);

    expect(result.watchProvidersMap.size).toBe(0);
  });
});
