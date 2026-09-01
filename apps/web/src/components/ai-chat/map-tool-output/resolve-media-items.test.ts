import { describe, expect, it } from "vitest";
import type { MediaListItem } from "#src/utils/media-list-item.ts";
import { resolveMediaItems } from "./resolve-media-items";

describe("resolveMediaItems", () => {
  const searchResults = new Map<string, MediaListItem>([
    [
      "movie:1",
      {
        id: 1,
        title: "Inception",
        posterPath: "/inception.jpg",
        rating: 8.4,
        mediaType: "movie",
      },
    ],
    [
      "tv:2",
      {
        id: 2,
        title: "Breaking Bad",
        posterPath: "/bb.jpg",
        rating: 9.5,
        mediaType: "tv",
      },
    ],
  ]);

  it("resolves items in specified order", () => {
    const input = {
      media: [
        { id: 2, media_type: "tv" },
        { id: 1, media_type: "movie" },
      ],
    };

    const items = resolveMediaItems(input, searchResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe("Breaking Bad");
    expect(items[1]?.title).toBe("Inception");
  });

  it("creates fallback for missing IDs", () => {
    const input = { media: [{ id: 999, media_type: "movie" }] };

    const items = resolveMediaItems(input, searchResults);

    expect(items).toEqual([{ id: 999, mediaType: "movie" }]);
  });

  it("handles mixed found and missing items", () => {
    const input = {
      media: [
        { id: 1, media_type: "movie" },
        { id: 999, media_type: "tv" },
      ],
    };

    const items = resolveMediaItems(input, searchResults);

    expect(items).toHaveLength(2);
    expect(items[0]?.title).toBe("Inception");
    expect(items[1]).toEqual({ id: 999, mediaType: "tv" });
  });

  it("returns empty for invalid input", () => {
    expect(resolveMediaItems(null, searchResults)).toEqual([]);
    expect(resolveMediaItems("string", searchResults)).toEqual([]);
    expect(resolveMediaItems({}, searchResults)).toEqual([]);
    expect(resolveMediaItems({ media: "not-array" }, searchResults)).toEqual(
      [],
    );
  });

  it("rejects entire input when any entry has invalid schema", () => {
    expect(
      resolveMediaItems(
        { media: [{ id: "abc", media_type: "movie" }] },
        searchResults,
      ),
    ).toEqual([]);

    expect(
      resolveMediaItems(
        { media: [{ id: 1, media_type: "person" }] },
        searchResults,
      ),
    ).toEqual([]);
  });
});
