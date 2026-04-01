import { http, HttpResponse } from "msw";
import { beforeAll, describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import {
  createMediaCreditsTool,
  mediaCreditsInputSchema,
} from "./media-credits";

beforeAll(() => {
  process.env.TMDB_API_TOKEN = "test-token";
});

const TMDB_BASE = "https://api.themoviedb.org";

function castMember(overrides: {
  id: number;
  name: string;
  character: string;
  order: number;
}) {
  return {
    adult: false,
    gender: 2,
    id: overrides.id,
    known_for_department: "Acting",
    name: overrides.name,
    original_name: overrides.name,
    popularity: 50,
    profile_path: `/profile-${overrides.id}.jpg`,
    cast_id: overrides.id,
    character: overrides.character,
    credit_id: `credit-${overrides.id}`,
    order: overrides.order,
  };
}

function crewMember(overrides: {
  id: number;
  name: string;
  department: string;
  job: string;
}) {
  return {
    adult: false,
    gender: 2,
    id: overrides.id,
    known_for_department: overrides.department,
    name: overrides.name,
    original_name: overrides.name,
    popularity: 30,
    profile_path: `/profile-${overrides.id}.jpg`,
    credit_id: `credit-${overrides.id}`,
    department: overrides.department,
    job: overrides.job,
  };
}

function creditsResponse(
  cast: ReturnType<typeof castMember>[],
  crew: ReturnType<typeof crewMember>[],
) {
  return { id: 550, cast, crew };
}

const executeContext = {
  toolCallId: "test",
  messages: [] as never[],
  abortSignal: AbortSignal.timeout(5000),
};

interface CastEntry {
  id: number;
  name: string | undefined;
  profile_path: string | undefined;
  known_for_department: string | undefined;
  character: string | undefined;
  order: number | undefined;
}

interface CrewEntry {
  id: number;
  name: string | undefined;
  profile_path: string | undefined;
  known_for_department: string | undefined;
  department: string | undefined;
  job: string | undefined;
}

interface CreditsResult {
  cast: CastEntry[];
  crew: CrewEntry[];
}

/**
 * Helper that calls execute and returns the result as a plain object.
 * The tool's generic return type confuses ESLint's type resolver,
 * so we round-trip through JSON to get a clean object.
 */
async function executeTool(input: {
  media_id: number;
  media_type: "movie" | "tv";
}) {
  const tool = createMediaCreditsTool();
  const result = await tool.execute!(input, executeContext);
  return JSON.parse(JSON.stringify(result)) as CreditsResult;
}

describe("mediaCreditsInputSchema", () => {
  it("accepts valid movie input", () => {
    const result = mediaCreditsInputSchema.parse({
      media_id: 550,
      media_type: "movie",
    });
    expect(result.media_id).toBe(550);
    expect(result.media_type).toBe("movie");
  });

  it("accepts valid TV input", () => {
    const result = mediaCreditsInputSchema.parse({
      media_id: 1399,
      media_type: "tv",
    });
    expect(result.media_id).toBe(1399);
    expect(result.media_type).toBe("tv");
  });

  it("rejects missing media_id", () => {
    expect(() =>
      mediaCreditsInputSchema.parse({ media_type: "movie" }),
    ).toThrow();
  });

  it("rejects missing media_type", () => {
    expect(() => mediaCreditsInputSchema.parse({ media_id: 550 })).toThrow();
  });

  it("rejects invalid media_type", () => {
    expect(() =>
      mediaCreditsInputSchema.parse({ media_id: 550, media_type: "person" }),
    ).toThrow();
  });

  it("rejects non-numeric media_id", () => {
    expect(() =>
      mediaCreditsInputSchema.parse({ media_id: "abc", media_type: "movie" }),
    ).toThrow();
  });
});

describe("createMediaCreditsTool", () => {
  it("returns a tool with description and inputSchema", () => {
    const tool = createMediaCreditsTool();
    expect(tool.description).toBeDefined();
    expect(tool.description).toContain("cast");
    expect(tool.inputSchema).toBeDefined();
  });

  it("returns a tool with an execute function", () => {
    const tool = createMediaCreditsTool();
    expect(tool.execute).toBeDefined();
    expect(typeof tool.execute).toBe("function");
  });
});

describe("media credits execute", () => {
  it("fetches movie credits and maps cast and crew", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/credits`, () =>
        HttpResponse.json(
          creditsResponse(
            [
              castMember({
                id: 819,
                name: "Edward Norton",
                character: "The Narrator",
                order: 0,
              }),
              castMember({
                id: 287,
                name: "Brad Pitt",
                character: "Tyler Durden",
                order: 1,
              }),
            ],
            [
              crewMember({
                id: 7467,
                name: "David Fincher",
                department: "Directing",
                job: "Director",
              }),
            ],
          ),
        ),
      ),
    );

    const result = await executeTool({ media_id: 550, media_type: "movie" });

    expect(result).toEqual({
      cast: [
        {
          id: 819,
          name: "Edward Norton",
          profile_path: "/profile-819.jpg",
          known_for_department: "Acting",
          character: "The Narrator",
          order: 0,
        },
        {
          id: 287,
          name: "Brad Pitt",
          profile_path: "/profile-287.jpg",
          known_for_department: "Acting",
          character: "Tyler Durden",
          order: 1,
        },
      ],
      crew: [
        {
          id: 7467,
          name: "David Fincher",
          profile_path: "/profile-7467.jpg",
          known_for_department: "Directing",
          department: "Directing",
          job: "Director",
        },
      ],
    });
  });

  it("fetches TV show credits using series_id", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${TMDB_BASE}/3/tv/1399/credits`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(
          creditsResponse(
            [
              castMember({
                id: 17286,
                name: "Emilia Clarke",
                character: "Daenerys Targaryen",
                order: 0,
              }),
            ],
            [],
          ),
        );
      }),
    );

    const result = await executeTool({ media_id: 1399, media_type: "tv" });

    expect(capturedUrl).toContain("/3/tv/1399/credits");
    expect(result.cast).toHaveLength(1);
    expect(result.cast[0]).toEqual(
      expect.objectContaining({
        id: 17286,
        name: "Emilia Clarke",
        character: "Daenerys Targaryen",
      }),
    );
  });

  it("caps cast at 20 entries", async () => {
    const largeCast = Array.from({ length: 30 }, (_, i) =>
      castMember({
        id: i + 1,
        name: `Actor ${i + 1}`,
        character: `Character ${i + 1}`,
        order: i,
      }),
    );

    server.use(
      http.get(`${TMDB_BASE}/3/movie/1/credits`, () =>
        HttpResponse.json(creditsResponse(largeCast, [])),
      ),
    );

    const result = await executeTool({ media_id: 1, media_type: "movie" });

    expect(result.cast).toHaveLength(20);
  });

  it("caps crew at 20 entries", async () => {
    const largeCrew = Array.from({ length: 25 }, (_, i) =>
      crewMember({
        id: i + 1,
        name: `Crew ${i + 1}`,
        department: "Production",
        job: `Job ${i + 1}`,
      }),
    );

    server.use(
      http.get(`${TMDB_BASE}/3/movie/1/credits`, () =>
        HttpResponse.json(creditsResponse([], largeCrew)),
      ),
    );

    const result = await executeTool({ media_id: 1, media_type: "movie" });

    expect(result.crew).toHaveLength(20);
  });

  it("handles empty cast and crew", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/999/credits`, () =>
        HttpResponse.json(creditsResponse([], [])),
      ),
    );

    const result = await executeTool({ media_id: 999, media_type: "movie" });

    expect(result).toEqual({ cast: [], crew: [] });
  });

  it("handles undefined cast and crew in response", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/999/credits`, () =>
        HttpResponse.json({ id: 999 }),
      ),
    );

    const result = await executeTool({ media_id: 999, media_type: "movie" });

    expect(result).toEqual({ cast: [], crew: [] });
  });

  it("strips extra fields from cast entries", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/credits`, () =>
        HttpResponse.json(
          creditsResponse(
            [
              castMember({
                id: 819,
                name: "Edward Norton",
                character: "The Narrator",
                order: 0,
              }),
            ],
            [],
          ),
        ),
      ),
    );

    const result = await executeTool({ media_id: 550, media_type: "movie" });

    const castKeys = Object.keys(result.cast[0]);
    expect(castKeys).toContain("id");
    expect(castKeys).toContain("name");
    expect(castKeys).toContain("profile_path");
    expect(castKeys).toContain("known_for_department");
    expect(castKeys).toContain("character");
    expect(castKeys).toContain("order");
    // These extra fields should be stripped
    expect(castKeys).not.toContain("adult");
    expect(castKeys).not.toContain("gender");
    expect(castKeys).not.toContain("popularity");
    expect(castKeys).not.toContain("original_name");
    expect(castKeys).not.toContain("cast_id");
    expect(castKeys).not.toContain("credit_id");
  });

  it("strips extra fields from crew entries", async () => {
    server.use(
      http.get(`${TMDB_BASE}/3/movie/550/credits`, () =>
        HttpResponse.json(
          creditsResponse(
            [],
            [
              crewMember({
                id: 7467,
                name: "David Fincher",
                department: "Directing",
                job: "Director",
              }),
            ],
          ),
        ),
      ),
    );

    const result = await executeTool({ media_id: 550, media_type: "movie" });

    const crewKeys = Object.keys(result.crew[0]);
    expect(crewKeys).toContain("id");
    expect(crewKeys).toContain("name");
    expect(crewKeys).toContain("profile_path");
    expect(crewKeys).toContain("known_for_department");
    expect(crewKeys).toContain("department");
    expect(crewKeys).toContain("job");
    // These extra fields should be stripped
    expect(crewKeys).not.toContain("adult");
    expect(crewKeys).not.toContain("gender");
    expect(crewKeys).not.toContain("popularity");
    expect(crewKeys).not.toContain("original_name");
    expect(crewKeys).not.toContain("credit_id");
  });

  it("converts media_id to string for API call", async () => {
    let capturedUrl = "";
    server.use(
      http.get(`${TMDB_BASE}/3/movie/12345/credits`, ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json(creditsResponse([], []));
      }),
    );

    await executeTool({ media_id: 12345, media_type: "movie" });

    expect(capturedUrl).toContain("/3/movie/12345/credits");
  });
});
