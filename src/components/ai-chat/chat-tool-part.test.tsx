import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
import { ChatToolPart } from "./chat-tool-part";

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

describe("ChatToolPart", () => {
  describe("search tools", () => {
    it("shows activity indicator while tmdb_search is in progress", () => {
      render(
        <ChatToolPart
          toolName="tmdb_search"
          state="input-streaming"
          input={undefined}
          searchResultsMap={emptyMap}
        />,
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("shows activity indicator while semantic_search is in progress", () => {
      render(
        <ChatToolPart
          toolName="semantic_search"
          state="input-available"
          input={{ query: "sci-fi" }}
          searchResultsMap={emptyMap}
        />,
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("renders nothing for completed tmdb_search", () => {
      const { container } = render(
        <ChatToolPart
          toolName="tmdb_search"
          state="output-available"
          input={{ query: "Inception" }}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("renders nothing for completed semantic_search", () => {
      const { container } = render(
        <ChatToolPart
          toolName="semantic_search"
          state="output-available"
          input={{ query: "sci-fi" }}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("shows error for failed search tool", () => {
      render(
        <ChatToolPart
          toolName="tmdb_search"
          state="output-error"
          input={undefined}
          searchResultsMap={emptyMap}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("present_media", () => {
    it("renders skeleton for input-streaming", () => {
      const { container } = render(
        <ChatToolPart
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
        <ChatToolPart
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
        <ChatToolPart
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
        <ChatToolPart
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
        <ChatToolPart
          toolName="present_media"
          state="output-error"
          input={undefined}
          searchResultsMap={searchResultsMap}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });

  describe("unknown tools", () => {
    it("shows activity indicator while in progress", () => {
      render(
        <ChatToolPart
          toolName="unknown_tool"
          state="input-streaming"
          input={undefined}
          searchResultsMap={emptyMap}
        />,
      );

      expect(screen.getByRole("status")).toBeInTheDocument();
    });

    it("returns null when complete", () => {
      const { container } = render(
        <ChatToolPart
          toolName="unknown_tool"
          state="output-available"
          input={{}}
          searchResultsMap={emptyMap}
        />,
      );

      expect(container.innerHTML).toBe("");
    });

    it("shows error for output-error state", () => {
      render(
        <ChatToolPart
          toolName="unknown_tool"
          state="output-error"
          input={undefined}
          searchResultsMap={emptyMap}
        />,
      );

      expect(screen.getByRole("alert")).toBeInTheDocument();
    });
  });
});
