import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import {
  createMediaCreditsTool,
  mediaCreditsInputSchema,
} from "./media-credits";
import { isToolError } from "./tool-error";

beforeAll(() => {
  process.env.TMDB_API_TOKEN = "test-token";
});

const TMDB_BASE = "https://api.themoviedb.org";

const executeContext = {
  toolCallId: "test",
  messages: [] as never[],
  abortSignal: AbortSignal.timeout(5000),
};

async function executeTool(
  input: { media_id: number; media_type: "movie" | "tv" },
  locale: "en" | "zh" = "en",
) {
  const tool = createMediaCreditsTool(locale);
  if (!tool.execute) throw new Error("expected execute");
  const result = await tool.execute(input, executeContext);
  return JSON.parse(JSON.stringify(result)) as unknown;
}

describe("mediaCreditsInputSchema", () => {
  it("accepts a numeric media_id with a movie media_type", () => {
    expect(
      mediaCreditsInputSchema.parse({ media_id: 550, media_type: "movie" }),
    ).toEqual({ media_id: 550, media_type: "movie" });
  });

  it("rejects an invalid media_type", () => {
    expect(() =>
      mediaCreditsInputSchema.parse({ media_id: 550, media_type: "book" }),
    ).toThrow();
  });
});

describe("createMediaCreditsTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createMediaCreditsTool("en");
    expect(tool.description).toBeDefined();
    expect(tool.description).toContain("cast and crew");
    expect(tool.inputSchema).toBeDefined();
  });
});

describe("media credits execute", () => {
  it("returns a structured tool error when TMDB fails", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/credits`, () =>
        HttpResponse.json(
          { status_message: "Service unavailable" },
          { status: 503 },
        ),
      ),
    );

    const tool = createMediaCreditsTool("en");
    if (!tool.execute) throw new Error("expected execute");
    const result = await tool.execute(
      { media_id: 550, media_type: "movie" },
      executeContext,
    );

    expect(isToolError(result)).toBe(true);
    if (isToolError(result)) {
      expect(result.reason).toBe("tmdb_unavailable");
    }
  });

  it("passes locale as the language parameter to TMDB for movies", async () => {
    let capturedLanguage: string | null = null;

    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/credits`, ({ request }) => {
        const url = new URL(request.url);
        capturedLanguage = url.searchParams.get("language");
        return HttpResponse.json({ id: 550, cast: [], crew: [] });
      }),
    );

    await executeTool({ media_id: 550, media_type: "movie" }, "zh");

    expect(capturedLanguage).toBe("zh");
  });

  it("passes locale as the language parameter to TMDB for tv shows", async () => {
    let capturedLanguage: string | null = null;

    server.use(
      http.get(`${TMDB_BASE}/3/tv/1399/credits`, ({ request }) => {
        const url = new URL(request.url);
        capturedLanguage = url.searchParams.get("language");
        return HttpResponse.json({ id: 1399, cast: [], crew: [] });
      }),
    );

    await executeTool({ media_id: 1399, media_type: "tv" }, "zh");

    expect(capturedLanguage).toBe("zh");
  });
});
