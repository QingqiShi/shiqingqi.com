import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { toDisplayParts } from "./to-display-parts";

type Part = UIMessage["parts"][number];

const text = (value: string): Part => ({ type: "text", text: value });
const source: Part = {
  type: "source-url",
  sourceId: "s1",
  url: "https://example.com",
};
const codeExecution: Part = {
  type: "dynamic-tool",
  toolName: "code_execution",
  toolCallId: "code-1",
  providerExecuted: true,
  state: "output-available",
  input: {},
  output: {},
};
const webSearch: Part = {
  type: "dynamic-tool",
  toolName: "web_search",
  toolCallId: "search-1",
  providerExecuted: true,
  state: "output-available",
  input: { query: "December releases" },
  output: [],
};

describe("toDisplayParts", () => {
  it("joins a cited span with the text around it into one part", () => {
    const parts = toDisplayParts([
      text("据 FandomWire 的榜单，"),
      source,
      text("它在圣诞档的票房被看好排第一"),
      text("。"),
    ]);

    expect(parts).toEqual([
      {
        type: "text",
        text: "据 FandomWire 的榜单，它在圣诞档的票房被看好排第一。",
      },
      source,
    ]);
  });

  it("keeps text on each side of a tool part apart", () => {
    const parts = toDisplayParts([
      text("Let me search."),
      webSearch,
      text("Found it."),
    ]);

    expect(parts).toEqual([
      text("Let me search."),
      webSearch,
      text("Found it."),
    ]);
  });

  it("drops the code execution steps of web search", () => {
    const parts = toDisplayParts([
      codeExecution,
      webSearch,
      codeExecution,
      text("Done."),
    ]);

    expect(parts).toEqual([webSearch, text("Done.")]);
  });
});
