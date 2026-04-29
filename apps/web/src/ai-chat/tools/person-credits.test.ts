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

async function executeTool(
  input: { person_id: number },
  locale: "en" | "zh" = "en",
) {
  const tool = createPersonCreditsTool(locale);
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
    const tool = createPersonCreditsTool("en");
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

  it("merges cast and crew entries for the same film into one credit carrying both character and department", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/person/287/combined_credits`, () =>
        HttpResponse.json({
          id: 287,
          cast: [
            castEntry({
              id: 100,
              title: "Million Dollar Baby",
              vote_average: 8,
            }),
          ],
          crew: [
            {
              id: 100,
              media_type: "movie",
              title: "Million Dollar Baby",
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
    expect(result[0].department).toBe("Directing");
  });

  it("merges cast and crew when the crew entry is processed first", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/person/287/combined_credits`, () =>
        HttpResponse.json({
          id: 287,
          cast: [castEntry({ id: 200, title: "Argo", vote_average: 7.7 })],
          crew: [
            // Standalone crew entry (no matching cast row) — should be kept.
            {
              id: 999,
              media_type: "movie",
              title: "Crew Only",
              poster_path: "/c.jpg",
              vote_average: 6,
              release_date: "2018-01-01",
              department: "Writing",
            },
            // Crew entry that matches a cast entry — should merge.
            {
              id: 200,
              media_type: "movie",
              title: "Argo",
              poster_path: "/p.jpg",
              vote_average: 7.7,
              release_date: "2012-01-01",
              department: "Directing",
            },
          ],
        }),
      ),
    );

    const result = await executeTool({ person_id: 287 });
    const argo = result.find((entry) => entry.id === 200);
    expect(argo).toBeDefined();
    if (!argo) throw new Error("expected argo entry");
    expect(argo.character).toBe("Test Character");
    expect(argo.department).toBe("Directing");

    const crewOnly = result.find((entry) => entry.id === 999);
    expect(crewOnly).toBeDefined();
    if (!crewOnly) throw new Error("expected crew-only entry");
    expect(crewOnly.character).toBeUndefined();
    expect(crewOnly.department).toBe("Writing");
  });

  it("keeps the highest-priority department when a film has multiple crew rows", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/person/287/combined_credits`, () =>
        HttpResponse.json({
          id: 287,
          cast: [],
          crew: [
            {
              id: 300,
              media_type: "movie",
              title: "Triple Threat",
              poster_path: "/t.jpg",
              vote_average: 7,
              release_date: "2019-01-01",
              department: "Production",
            },
            {
              id: 300,
              media_type: "movie",
              title: "Triple Threat",
              poster_path: "/t.jpg",
              vote_average: 7,
              release_date: "2019-01-01",
              department: "Directing",
            },
            {
              id: 300,
              media_type: "movie",
              title: "Triple Threat",
              poster_path: "/t.jpg",
              vote_average: 7,
              release_date: "2019-01-01",
              department: "Writing",
            },
          ],
        }),
      ),
    );

    const result = await executeTool({ person_id: 287 });
    expect(result).toHaveLength(1);
    expect(result[0].department).toBe("Directing");
  });

  it("preserves character-only and department-only entries when there is no overlap", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/person/287/combined_credits`, () =>
        HttpResponse.json({
          id: 287,
          cast: [castEntry({ id: 1, title: "Acted Only", vote_average: 8 })],
          crew: [
            {
              id: 2,
              media_type: "movie",
              title: "Directed Only",
              poster_path: "/d.jpg",
              vote_average: 7,
              release_date: "2015-01-01",
              department: "Directing",
            },
          ],
        }),
      ),
    );

    const result = await executeTool({ person_id: 287 });

    const acted = result.find((entry) => entry.id === 1);
    const directed = result.find((entry) => entry.id === 2);
    expect(acted?.character).toBe("Test Character");
    expect(acted?.department).toBeUndefined();
    expect(directed?.character).toBeUndefined();
    expect(directed?.department).toBe("Directing");
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

    const tool = createPersonCreditsTool("en");
    if (!tool.execute) throw new Error("expected execute");
    const result = await tool.execute({ person_id: 287 }, executeContext);

    expect(isToolError(result)).toBe(true);
    if (isToolError(result)) {
      expect(result.reason).toBe("tmdb_unavailable");
    }
  });

  it("passes locale as the language parameter to TMDB", async () => {
    let capturedLanguage: string | null = null;

    server.use(
      http.get(`${TMDB_BASE}/3/person/287/combined_credits`, ({ request }) => {
        const url = new URL(request.url);
        capturedLanguage = url.searchParams.get("language");
        return HttpResponse.json({
          id: 287,
          cast: [castEntry({ id: 1, title: "绿里奇迹", vote_average: 8 })],
          crew: [],
        });
      }),
    );

    await executeTool({ person_id: 287 }, "zh");

    expect(capturedLanguage).toBe("zh");
  });
});
