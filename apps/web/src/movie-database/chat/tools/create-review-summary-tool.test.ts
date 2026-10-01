import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { isRecord } from "#src/movie-database/is-record.ts";
import { server } from "#src/testing/test-msw.ts";
import {
  createReviewSummaryTool,
  reviewSummaryInputSchema,
} from "./create-review-summary-tool";
import { isToolError } from "./tool-error";
import { TMDB_BASE, toolExecutionOptions } from "./tool-execution-options";

beforeAll(() => {
  process.env.TMDB_API_TOKEN = "test-token";
  process.env.ANTHROPIC_API_KEY = "test-key";
});

const ANTHROPIC_BASE = "https://api.anthropic.com";

function reviewsResponse(
  id: number,
  reviews: Array<{
    author: string;
    content: string;
    rating?: number;
  }>,
) {
  return {
    id,
    page: 1,
    total_pages: 1,
    total_results: reviews.length,
    results: reviews.map((r, i) => ({
      author: r.author,
      author_details: {
        name: r.author,
        username: r.author.toLowerCase(),
        avatar_path: null,
        rating: r.rating ?? null,
      },
      content: r.content,
      created_at: "2024-01-01T00:00:00.000Z",
      id: `review-${String(i)}`,
      updated_at: "2024-01-01T00:00:00.000Z",
    })),
  };
}

function anthropicMessageResponse(text: string) {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    content: [{ type: "text", text }],
    model: "claude-sonnet-4-6",
    stop_reason: "end_turn",
    usage: { input_tokens: 100, output_tokens: 50 },
  };
}

interface ReviewSummaryResult {
  id: number;
  mediaType: string;
  title: string;
  spiciness: number;
  summary: string;
  reviewCount: number;
  averageRating: number | null;
}

function isReviewSummaryResult(value: unknown): value is ReviewSummaryResult {
  return isRecord(value) && typeof value.id === "number";
}

async function executeTool(input: {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  spiciness?: number;
}) {
  const tool = createReviewSummaryTool("en");
  const parsed = reviewSummaryInputSchema.parse(input);
  const result = await tool.execute(parsed, toolExecutionOptions());
  const jsonResult: unknown = JSON.parse(JSON.stringify(result));
  if (!isReviewSummaryResult(jsonResult)) {
    throw new Error("expected a review summary result");
  }
  return jsonResult;
}

describe("reviewSummaryInputSchema", () => {
  const fightClub = { id: 550, media_type: "movie", title: "Fight Club" };

  it("defaults spiciness to 3", () => {
    expect(reviewSummaryInputSchema.parse(fightClub).spiciness).toBe(3);
  });

  it("accepts only whole spiciness steps from 1 to 5", () => {
    for (const spiciness of [1, 5]) {
      expect(
        reviewSummaryInputSchema.parse({ ...fightClub, spiciness }).spiciness,
      ).toBe(spiciness);
    }
    for (const spiciness of [0, 6, 2.5]) {
      expect(() =>
        reviewSummaryInputSchema.parse({ ...fightClub, spiciness }),
      ).toThrow();
    }
  });
});

describe("review summary execute", () => {
  it("returns summary for a movie with reviews", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/reviews`, () =>
        HttpResponse.json(
          reviewsResponse(550, [
            {
              author: "Reviewer1",
              content: "A masterpiece of modern cinema.",
              rating: 9,
            },
            {
              author: "Reviewer2",
              content: "Thought-provoking and beautifully directed.",
              rating: 8,
            },
          ]),
        ),
      ),
      http.post(`${ANTHROPIC_BASE}/v1/messages`, () =>
        HttpResponse.json(
          anthropicMessageResponse(
            "An overwhelmingly positive reception, praised for its direction and thought-provoking narrative.",
          ),
        ),
      ),
    );

    const result = await executeTool({
      id: 550,
      media_type: "movie",
      title: "Fight Club",
      spiciness: 3,
    });

    expect(result.id).toBe(550);
    expect(result.mediaType).toBe("movie");
    expect(result.title).toBe("Fight Club");
    expect(result.spiciness).toBe(3);
    expect(result.summary).toContain("positive");
    expect(result.reviewCount).toBe(2);
    expect(result.averageRating).toBe(8.5);
  });

  it("returns summary for a TV show", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/tv/1399/reviews`, () =>
        HttpResponse.json(
          reviewsResponse(1399, [
            {
              author: "Reviewer1",
              content: "Best TV series ever made.",
              rating: 10,
            },
          ]),
        ),
      ),
      http.post(`${ANTHROPIC_BASE}/v1/messages`, () =>
        HttpResponse.json(
          anthropicMessageResponse("Widely regarded as one of the best."),
        ),
      ),
    );

    const result = await executeTool({
      id: 1399,
      media_type: "tv",
      title: "Game of Thrones",
    });

    expect(result.id).toBe(1399);
    expect(result.mediaType).toBe("tv");
    expect(result.reviewCount).toBe(1);
    expect(result.averageRating).toBe(10);
  });

  it("handles no reviews gracefully", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/999999/reviews`, () =>
        HttpResponse.json({
          id: 999999,
          page: 1,
          total_pages: 0,
          total_results: 0,
          results: [],
        }),
      ),
    );

    const result = await executeTool({
      id: 999999,
      media_type: "movie",
      title: "Unknown Movie",
    });

    expect(result.reviewCount).toBe(0);
    expect(result.averageRating).toBeNull();
    expect(result.summary).toContain("Unknown Movie");
  });

  it("returns null averageRating when reviews have no ratings", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/reviews`, () =>
        HttpResponse.json(
          reviewsResponse(550, [
            { author: "Reviewer1", content: "Great movie!" },
            { author: "Reviewer2", content: "Loved it." },
          ]),
        ),
      ),
      http.post(`${ANTHROPIC_BASE}/v1/messages`, () =>
        HttpResponse.json(
          anthropicMessageResponse("Generally positive reception."),
        ),
      ),
    );

    const result = await executeTool({
      id: 550,
      media_type: "movie",
      title: "Fight Club",
    });

    expect(result.averageRating).toBeNull();
    expect(result.reviewCount).toBe(2);
  });

  it("passes spiciness through to the result", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/reviews`, () =>
        HttpResponse.json(
          reviewsResponse(550, [
            { author: "R1", content: "Awesome!", rating: 9 },
          ]),
        ),
      ),
      http.post(`${ANTHROPIC_BASE}/v1/messages`, () =>
        HttpResponse.json(anthropicMessageResponse("A wild ride of a movie!")),
      ),
    );

    const result = await executeTool({
      id: 550,
      media_type: "movie",
      title: "Fight Club",
      spiciness: 5,
    });

    expect(result.spiciness).toBe(5);
  });
});

describe("review summary error handling", () => {
  it("returns a tmdb_unavailable error when TMDB reviews fetch fails", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/reviews`, () =>
        HttpResponse.json({ status_message: "Rate limited" }, { status: 429 }),
      ),
    );

    const tool = createReviewSummaryTool("en");
    const parsed = reviewSummaryInputSchema.parse({
      id: 550,
      media_type: "movie",
      title: "Fight Club",
    });
    const result = await tool.execute(parsed, toolExecutionOptions());

    expect(isToolError(result)).toBe(true);
    if (isToolError(result)) {
      expect(result.reason).toBe("tmdb_unavailable");
    }
  });

  it("returns a summary_generation_failed error when the LLM call fails", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/reviews`, () =>
        HttpResponse.json(
          reviewsResponse(550, [
            { author: "R1", content: "Great movie!", rating: 9 },
          ]),
        ),
      ),
      http.post(`${ANTHROPIC_BASE}/v1/messages`, () =>
        HttpResponse.json(
          {
            type: "error",
            error: { type: "invalid_request_error", message: "bad request" },
          },
          { status: 400 },
        ),
      ),
    );

    const tool = createReviewSummaryTool("en");
    const parsed = reviewSummaryInputSchema.parse({
      id: 550,
      media_type: "movie",
      title: "Fight Club",
    });
    const result = await tool.execute(parsed, toolExecutionOptions());

    expect(isToolError(result)).toBe(true);
    if (isToolError(result)) {
      expect(result.reason).toBe("summary_generation_failed");
    }
  });
});
