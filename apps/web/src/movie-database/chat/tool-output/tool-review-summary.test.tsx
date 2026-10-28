import { describe, expect, it } from "vitest";
import { parseReviewSummaryOutput } from "./tool-review-summary";

describe("parseReviewSummaryOutput", () => {
  it("parses valid output", () => {
    const output = {
      id: 550,
      mediaType: "movie",
      title: "Fight Club",
      spiciness: 3,
      summary: "Great movie.",
      reviewCount: 10,
      averageRating: 8.5,
    };
    const result = parseReviewSummaryOutput(output);
    expect(result).not.toBeNull();
    expect(result?.id).toBe(550);
    expect(result?.summary).toBe("Great movie.");
    expect(result?.averageRating).toBe(8.5);
  });

  it("returns null for invalid output", () => {
    expect(parseReviewSummaryOutput(null)).toBeNull();
    expect(parseReviewSummaryOutput(undefined)).toBeNull();
    expect(parseReviewSummaryOutput("string")).toBeNull();
    expect(parseReviewSummaryOutput({ id: "not-a-number" })).toBeNull();
  });

  it("rejects invalid mediaType", () => {
    const output = {
      id: 550,
      mediaType: "person",
      title: "Fight Club",
      spiciness: 3,
      summary: "Great movie.",
      reviewCount: 10,
      averageRating: 8.5,
    };
    expect(parseReviewSummaryOutput(output)).toBeNull();
  });
});
