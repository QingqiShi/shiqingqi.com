import { describe, expect, it } from "vitest";
import { createSemanticSearchTool } from "./create-semantic-search-tool";
import { isToolError } from "./tool-error";
import { toolExecutionOptions } from "./tool-execution-options";

describe("semantic search error handling", () => {
  it("returns a structured tool error when the vector index is unavailable", async () => {
    // UPSTASH_VECTOR_REST_URL is not set in the test environment, so
    // getVectorIndex() throws. The tool should convert that into a
    // structured error rather than propagating the exception.
    const tool = createSemanticSearchTool("en");
    const result = await tool.execute(
      { query: "mind-bending sci-fi" },
      toolExecutionOptions(),
    );

    expect(isToolError(result)).toBe(true);
    if (isToolError(result)) {
      expect(result.reason).toBe("vector_search_unavailable");
    }
  });
});
