import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
import { ToolVisualOutput } from "./tool-visual-output";

const searchResultsMap = new Map<string, MediaListItem>([
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
    "tv:100",
    {
      id: 100,
      title: "Dark",
      posterPath: "/dark.jpg",
      rating: 8.8,
      mediaType: "tv",
    },
  ],
]);

const emptyMap = new Map<string, MediaListItem>();

describe("ToolVisualOutput", () => {
  describe("present_media", () => {
    it("renders skeleton for input-streaming", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="present_media"
          state="input-streaming"
          input={undefined}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(container.innerHTML).not.toBe("");
    });

    it("renders cards for input-available", () => {
      render(
        <ToolVisualOutput
          toolName="present_media"
          state="input-available"
          input={{ media: [{ id: 1, media_type: "movie" }] }}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(screen.getByAltText("Inception")).toBeInTheDocument();
      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/movie-database/movie/1",
      );
    });

    it("renders cards for output-available", () => {
      render(
        <ToolVisualOutput
          toolName="present_media"
          state="output-available"
          input={{
            media: [
              { id: 100, media_type: "tv" },
              { id: 1, media_type: "movie" },
            ],
          }}
          searchResultsMap={searchResultsMap}
        />,
      );

      const links = screen.getAllByRole("link");
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute("href", "/movie-database/tv/100");
      expect(links[1]).toHaveAttribute("href", "/movie-database/movie/1");
    });

    it("renders fallback card when ID not in search results", () => {
      render(
        <ToolVisualOutput
          toolName="present_media"
          state="output-available"
          input={{ media: [{ id: 999, media_type: "movie" }] }}
          searchResultsMap={emptyMap}
        />,
      );

      expect(screen.getByRole("link")).toHaveAttribute(
        "href",
        "/movie-database/movie/999",
      );
    });

    it("shows error for output-error state", () => {
      render(
        <ToolVisualOutput
          toolName="present_media"
          state="output-error"
          input={undefined}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("non-present_media tools", () => {
    it("returns null for tmdb_search", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="tmdb_search"
          state="output-available"
          input={{ query: "test" }}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("returns null for semantic_search", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="semantic_search"
          state="output-available"
          input={{ query: "test" }}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("returns null for unknown tools", () => {
      const { container } = render(
        <ToolVisualOutput
          toolName="unknown_tool"
          state="output-available"
          input={{}}
          searchResultsMap={emptyMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });
  });
});
