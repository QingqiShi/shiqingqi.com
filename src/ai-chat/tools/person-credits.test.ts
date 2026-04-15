import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import {
  createPersonCreditsTool,
  personCreditsInputSchema,
} from "./person-credits";
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

interface CreditEntry {
  id: number;
  media_type: "movie" | "tv" | undefined;
  title: string | undefined;
  poster_path: string | undefined;
  vote_average: number;
  release_date: string | undefined;
  character: string | undefined;
  department: string | undefined;
}

async function executeTool(input: { person_id: number }) {
  const tool = createPersonCreditsTool();
  if (!tool.execute) throw new Error("expected execute");
  const result = await tool.execute(input, executeContext);
  return JSON.parse(JSON.stringify(result)) as CreditEntry[];
}

function castEntry(overrides: {
  id: number;
  title: string;
  vote_average: number;
}) {
  return {
    id: overrides.id,
    title: overrides.title,
    media_type: "movie",
    poster_path: `/poster-${String(overrides.id)}.jpg`,
    vote_average: overrides.vote_average,
    release_date: "2020-01-01",
    character: "Test Character",
  };
}

describe("personCreditsInputSchema", () => {
  it("accepts a numeric person_id", () => {
    expect(personCreditsInputSchema.parse({ person_id: 287 })).toEqual({
      person_id: 287,
    });
  });

  it("rejects a string person_id", () => {
    expect(() =>
      personCreditsInputSchema.parse({ person_id: "287" }),
    ).toThrow();
  });
});

describe("createPersonCreditsTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createPersonCreditsTool();
    expect(tool.description).toBeDefined();
    expect(tool.description).toContain("filmography");
    expect(tool.inputSchema).toBeDefined();
  });
});

describe("person credits execute", () => {
  it("returns sorted credits for a typical person", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/person/287/combined_credits`, () =>
        HttpResponse.json({
          id: 287,
          cast: [
            castEntry({ id: 1, title: "Low Rated", vote_average: 5.0 }),
            castEntry({ id: 2, title: "High Rated", vote_average: 9.0 }),
            castEntry({ id: 3, title: "Mid Rated", vote_average: 7.0 }),
          ],
          crew: [],
        }),
      ),
    );

    const result = await executeTool({ person_id: 287 });

    expect(result.map((entry) => entry.title)).toEqual([
      "High Rated",
      "Mid Rated",
      "Low Rated",
    ]);
  });

  it("caps the result list at 30 entries when the filmography is large", async () => {
    // Build 60 entries with descending vote_average so we can verify both
    // (a) the cap, and (b) that the highest-rated entries survive.
    const cast = Array.from({ length: 60 }, (_, i) =>
      castEntry({
        id: i + 1,
        title: `Film ${String(i + 1)}`,
        vote_average: 9.9 - i * 0.1,
      }),
    );

    server.use(
      http.get(`${TMDB_BASE}/3/person/287/combined_credits`, () =>
        HttpResponse.json({ id: 287, cast, crew: [] }),
      ),
    );

    const result = await executeTool({ person_id: 287 });

    expect(result).toHaveLength(30);
    // Entry 1 has the highest rating (9.9); entry 30 has the 30th highest (7.0).
    expect(result[0].id).toBe(1);
    expect(result[29].id).toBe(30);
    // The 31st-rated entry must NOT appear in the truncated output.
    expect(result.map((entry) => entry.id)).not.toContain(31);
  });

  it("dedupes entries that appear in both cast and crew before applying the cap", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/person/287/combined_credits`, () =>
        HttpResponse.json({
          id: 287,
          cast: [castEntry({ id: 100, title: "Dual Role", vote_average: 8 })],
          crew: [
            {
              id: 100,
              media_type: "movie",
              title: "Dual Role",
              poster_path: "/p.jpg",
              vote_average: 8,
              release_date: "2020-01-01",
              department: "Directing",
            },
          ],
        }),
      ),
    );

    const result = await executeTool({ person_id: 287 });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(100);
    expect(result[0].character).toBe("Test Character");
  });

  it("returns a structured tool error when TMDB fails", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/person/287/combined_credits`, () =>
        HttpResponse.json(
          { status_message: "Service unavailable" },
          { status: 503 },
        ),
      ),
    );

    const tool = createPersonCreditsTool();
    if (!tool.execute) throw new Error("expected execute");
    const result = await tool.execute({ person_id: 287 }, executeContext);

    expect(isToolError(result)).toBe(true);
    if (isToolError(result)) {
      expect(result.reason).toBe("tmdb_unavailable");
    }
  });
});
