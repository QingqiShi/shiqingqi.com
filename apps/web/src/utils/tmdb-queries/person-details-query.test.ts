import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { server } from "#src/test-msw.ts";
import { callQueryFn } from "./call-query-fn";
import { personDetailsQuery } from "./person-details-query";

function personDetailsResponse(
  overrides: Partial<{
    name: string;
    profile_path: string;
    biography: string;
    birthday: string;
    deathday: unknown;
    known_for_department: string;
  }> = {},
) {
  return {
    adult: false,
    id: 31,
    name: "Tom Hanks",
    profile_path: "/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg",
    biography: "Thomas Jeffrey Hanks is an American actor and filmmaker.",
    birthday: "1956-07-09",
    deathday: null,
    gender: 2,
    homepage: null,
    imdb_id: "nm0000158",
    known_for_department: "Acting",
    place_of_birth: "Concord, California, USA",
    popularity: 82.989,
    also_known_as: [],
    ...overrides,
  };
}

describe("personDetailsQuery", () => {
  it("normalizes person details", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(personDetailsResponse()),
      ),
    );

    const options = personDetailsQuery({ id: "31" });
    const result = await callQueryFn(options);

    expect(result).toEqual({
      name: "Tom Hanks",
      profilePath: "/xndWFsBlClOJFRdhSt4NBwiPq2o.jpg",
      biography: "Thomas Jeffrey Hanks is an American actor and filmmaker.",
      birthday: "1956-07-09",
      deathday: null,
      knownForDepartment: "Acting",
    });
  });

  it("returns deathday when it is a string", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(personDetailsResponse({ deathday: "2014-08-11" })),
      ),
    );

    const options = personDetailsQuery({ id: "31" });
    const result = await callQueryFn(options);

    expect(result.deathday).toBe("2014-08-11");
  });

  it("returns null deathday for non-string values", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(personDetailsResponse({ deathday: 0 })),
      ),
    );

    const options = personDetailsQuery({ id: "31" });
    const result = await callQueryFn(options);

    expect(result.deathday).toBeNull();
  });

  it("falls back to empty string when name is missing", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(personDetailsResponse({ name: undefined })),
      ),
    );

    const options = personDetailsQuery({ id: "31" });
    const result = await callQueryFn(options);

    expect(result.name).toBe("");
  });

  it("returns null for missing optional fields", async () => {
    server.use(
      http.get("*/api/tmdb/get-person-details", () =>
        HttpResponse.json(
          personDetailsResponse({
            profile_path: undefined,
            biography: undefined,
            birthday: undefined,
            known_for_department: undefined,
          }),
        ),
      ),
    );

    const options = personDetailsQuery({ id: "31" });
    const result = await callQueryFn(options);

    expect(result.profilePath).toBeNull();
    expect(result.biography).toBeNull();
    expect(result.birthday).toBeNull();
    expect(result.knownForDepartment).toBeNull();
  });

  it("passes person_id and language as query params", async () => {
    let requestUrl = "";
    server.use(
      http.get("*/api/tmdb/get-person-details", ({ request }) => {
        requestUrl = request.url;
        return HttpResponse.json(personDetailsResponse());
      }),
    );

    const options = personDetailsQuery({ id: "31", language: "zh" });
    await callQueryFn(options);

    const url = new URL(requestUrl);
    expect(url.searchParams.get("person_id")).toBe("31");
    expect(url.searchParams.get("language")).toBe("zh");
  });
});
