import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { isRecord } from "#src/movie-database/is-record.ts";
import { server } from "#src/testing/test-msw.ts";
import { createPersonCreditsTool } from "./create-person-credits-tool";
import { TMDB_BASE, toolExecutionOptions } from "./tool-execution-options";

beforeAll(() => {
  process.env.TMDB_API_TOKEN = "test-token";
});

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

function isCreditEntryArray(value: unknown): value is CreditEntry[] {
  return (
    Array.isArray(value) &&
    value.every((entry) => isRecord(entry) && typeof entry.id === "number")
  );
}

async function executeTool(
  input: { person_id: number },
  locale: "en" | "zh" = "en",
) {
  const tool = createPersonCreditsTool(locale);
  const result = await tool.execute(input, toolExecutionOptions());
  const parsed: unknown = JSON.parse(JSON.stringify(result));
  if (!isCreditEntryArray(parsed)) {
    throw new Error("expected an array of credit entries");
  }
  return parsed;
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

describe("person credits execute", () => {
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
});
