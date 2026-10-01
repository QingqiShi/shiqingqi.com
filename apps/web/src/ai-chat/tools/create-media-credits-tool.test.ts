import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import { createMediaCreditsTool } from "./create-media-credits-tool";
import { isToolError } from "./tool-error";
import { TMDB_BASE, toolExecutionOptions } from "./tool-execution-options";

beforeAll(() => {
  process.env.TMDB_API_TOKEN = "test-token";
});

async function executeTool(
  input: { media_id: number; media_type: "movie" | "tv" },
  locale: "en" | "zh" = "en",
) {
  const tool = createMediaCreditsTool(locale);
  const result = await tool.execute(input, toolExecutionOptions());
  const parsed: unknown = JSON.parse(JSON.stringify(result));
  return parsed;
}

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
    const result = await tool.execute(
      { media_id: 550, media_type: "movie" },
      toolExecutionOptions(),
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
