import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import {
  createReviewSummaryTool,
  reviewSummaryInputSchema,
} from "./review-summary";

beforeAll(() => {
  process.env.TMDB_API_TOKEN = "test-token";
  process.env.ANTHROPIC_API_KEY = "test-key";
});

const TMDB_BASE = "https://api.themoviedb.org";
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
      id: `review-${i}`,
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

const executeContext = {
  toolCallId: "test",
  messages: [],
  abortSignal: AbortSignal.timeout(10000),
};

interface ReviewSummaryResult {
  id: number;
  mediaType: string;
  title: string;
  spiciness: number;
  summary: string;
  reviewCount: number;
  averageRating: number | null;
}

async function executeTool(input: {
  id: number;
  media_type: "movie" | "tv";
  title: string;
  spiciness?: number;
}) {
  const tool = createReviewSummaryTool("en");
  const parsed = reviewSummaryInputSchema.parse(input);
  const result = await tool.execute!(parsed, executeContext);
  return JSON.parse(JSON.stringify(result)) as ReviewSummaryResult;
}

describe("reviewSummaryInputSchema", () => {
  it("accepts valid input with all fields", () => {
    const result = reviewSummaryInputSchema.parse({
      id: 550,
      media_type: "movie",
      title: "Fight Club",
      spiciness: 4,
    });
    expect(result).toEqual({
      id: 550,
      media_type: "movie",
      title: "Fight Club",
      spiciness: 4,
    });
  });

  it("accepts input without optional spiciness (defaults to 3)", () => {
    const result = reviewSummaryInputSchema.parse({
      id: 1399,
      media_type: "tv",
      title: "Game of Thrones",
    });
    expect(result).toEqual({
      id: 1399,
      media_type: "tv",
      title: "Game of Thrones",
      spiciness: 3,
    });
  });

  it("rejects invalid media_type", () => {
    expect(() =>
      reviewSummaryInputSchema.parse({
        id: 550,
        media_type: "person",
        title: "Fight Club",
      }),
    ).toThrow();
  });

  it("rejects spiciness below 1", () => {
    expect(() =>
      reviewSummaryInputSchema.parse({
        id: 550,
        media_type: "movie",
        title: "Fight Club",
        spiciness: 0,
      }),
    ).toThrow();
  });

  it("rejects spiciness above 5", () => {
    expect(() =>
      reviewSummaryInputSchema.parse({
        id: 550,
        media_type: "movie",
        title: "Fight Club",
        spiciness: 6,
      }),
    ).toThrow();
  });

  it("rejects non-integer spiciness", () => {
    expect(() =>
      reviewSummaryInputSchema.parse({
        id: 550,
        media_type: "movie",
        title: "Fight Club",
        spiciness: 2.5,
      }),
    ).toThrow();
  });

  it("rejects missing title", () => {
    expect(() =>
      reviewSummaryInputSchema.parse({
        id: 550,
        media_type: "movie",
      }),
    ).toThrow();
  });
});

describe("createReviewSummaryTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createReviewSummaryTool("en");
    expect(tool.description).toBeDefined();
    expect(tool.description).toContain("review");
    expect(tool.inputSchema).toBeDefined();
  });

  it("returns a tool with an execute function", () => {
    const tool = createReviewSummaryTool("en");
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe("function");
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
