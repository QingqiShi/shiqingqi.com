import { describe, expect, it } from "vitest";
import { TmdbNotFoundError } from "#src/movie-database/tmdb/tmdb-get.ts";
import { detailsOrNotFound } from "./details-or-not-found";

describe("detailsOrNotFound", () => {
  it("returns the details TMDB found", async () => {
    await expect(
      detailsOrNotFound(Promise.resolve({ id: 1 })),
    ).resolves.toEqual({ id: 1 });
  });

  it("calls notFound() when TMDB has no such record", async () => {
    await expect(
      detailsOrNotFound(Promise.reject(new TmdbNotFoundError("gone"))),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });

  it("lets any other failure through", async () => {
    const failure = new Error("Failed to fetch /3/movie/{movie_id} (500:)");

    await expect(detailsOrNotFound(Promise.reject(failure))).rejects.toBe(
      failure,
    );
  });
});
