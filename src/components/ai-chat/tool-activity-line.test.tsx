import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { ToolActivityLine } from "./tool-activity-line";

describe("ToolActivityLine", () => {
  describe("tool labels", () => {
    it("maps tmdb_search to TMDB Search", () => {
      render(
        <ToolActivityLine
          toolName="tmdb_search"
          state="output-available"
          input={{ query: "test" }}
        />,
      );
      expect(screen.getByText("TMDB Search")).toBeInTheDocument();
    });

    it("maps semantic_search to Semantic Search", () => {
      render(
        <ToolActivityLine
          toolName="semantic_search"
          state="output-available"
          input={{ query: "test" }}
        />,
      );
      expect(screen.getByText("Semantic Search")).toBeInTheDocument();
    });

    it("maps present_media to Presenting Results", () => {
      render(
        <ToolActivityLine
          toolName="present_media"
          state="output-available"
          input={{ media: [{ id: 1, media_type: "movie" }] }}
        />,
      );
      expect(screen.getByText("Presenting Results")).toBeInTheDocument();
    });

    it("maps watch_providers to Watch Providers", () => {
      render(
        <ToolActivityLine
          toolName="watch_providers"
          state="output-available"
          input={{ id: 550, media_type: "movie", region: "US" }}
        />,
      );
      expect(screen.getByText("Watch Providers")).toBeInTheDocument();
    });

    it("maps review_summary to Review Summary", () => {
      render(
        <ToolActivityLine
          toolName="review_summary"
          state="output-available"
          input={{
            id: 550,
            media_type: "movie",
            title: "Fight Club",
            spiciness: 3,
          }}
        />,
      );
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    it("maps web_search to Web Search", () => {
      render(
        <ToolActivityLine
          toolName="web_search"
          state="output-available"
          input={{ query: "oscars best picture 2026" }}
        />,
      );
      expect(screen.getByText("Web Search")).toBeInTheDocument();
    });

    it("shows raw name for unknown tools", () => {
      render(
        <ToolActivityLine
          toolName="custom_tool"
          state="output-available"
          input={{}}
        />,
      );
      expect(screen.getByText("custom_tool")).toBeInTheDocument();
    });
  });

  describe("status indicators", () => {
    it("renders pulsing dot for in-progress states", () => {
      const { container } = render(
        <ToolActivityLine
          toolName="tmdb_search"
          state="input-streaming"
          input={undefined}
        />,
      );
      // The pulsing dot is a span with animation
      const dots = container.querySelectorAll("span");
      // Should have at least one animated span (the dot)
      expect(dots.length).toBeGreaterThan(0);
    });

    it("renders check icon for output-available", () => {
      const { container } = render(
        <ToolActivityLine
          toolName="tmdb_search"
          state="output-available"
          input={{ query: "test" }}
        />,
      );
      // Check icon is an SVG
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders warning icon for output-error", () => {
      const { container } = render(
        <ToolActivityLine
          toolName="tmdb_search"
          state="output-error"
          input={undefined}
        />,
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });

    it("renders warning icon for output-denied", () => {
      const { container } = render(
        <ToolActivityLine
          toolName="tmdb_search"
          state="output-denied"
          input={undefined}
        />,
      );
      const svg = container.querySelector("svg");
      expect(svg).toBeInTheDocument();
    });
  });

  describe("input summary", () => {
    it("shows query text for search tools", () => {
      render(
        <ToolActivityLine
          toolName="tmdb_search"
          state="output-available"
          input={{ query: "Inception" }}
        />,
      );
      expect(screen.getByText('"Inception"')).toBeInTheDocument();
    });

    it("shows item count for present_media", () => {
      render(
        <ToolActivityLine
          toolName="present_media"
          state="output-available"
          input={{
            media: [
              { id: 1, media_type: "movie" },
              { id: 2, media_type: "tv" },
            ],
          }}
        />,
      );
      expect(screen.getByText("2 items")).toBeInTheDocument();
    });

    it("shows singular item count for present_media with 1 item", () => {
      render(
        <ToolActivityLine
          toolName="present_media"
          state="output-available"
          input={{ media: [{ id: 1, media_type: "movie" }] }}
        />,
      );
      expect(screen.getByText("1 item")).toBeInTheDocument();
    });

    it("shows region for watch_providers", () => {
      render(
        <ToolActivityLine
          toolName="watch_providers"
          state="output-available"
          input={{ id: 550, media_type: "movie", region: "GB" }}
        />,
      );
      expect(screen.getByText("GB")).toBeInTheDocument();
    });

    it("shows provider name for watch_providers in provider search mode", () => {
      render(
        <ToolActivityLine
          toolName="watch_providers"
          state="output-available"
          input={{
            id: 550,
            media_type: "movie",
            provider_name: "Netflix",
          }}
        />,
      );
      expect(screen.getByText("Netflix")).toBeInTheDocument();
    });

    it("prefers provider_name over region for watch_providers summary", () => {
      render(
        <ToolActivityLine
          toolName="watch_providers"
          state="output-available"
          input={{
            id: 550,
            media_type: "movie",
            provider_name: "Disney Plus",
            region: "US",
          }}
        />,
      );
      expect(screen.getByText("Disney Plus")).toBeInTheDocument();
    });

    it("shows title for review_summary", () => {
      render(
        <ToolActivityLine
          toolName="review_summary"
          state="output-available"
          input={{
            id: 550,
            media_type: "movie",
            title: "Fight Club",
            spiciness: 3,
          }}
        />,
      );
      expect(screen.getByText("Fight Club")).toBeInTheDocument();
    });

    it("shows query text for web_search", () => {
      render(
        <ToolActivityLine
          toolName="web_search"
          state="output-available"
          input={{ query: "Oscars 2026 winners" }}
        />,
      );
      expect(screen.getByText('"Oscars 2026 winners"')).toBeInTheDocument();
    });

    it("omits summary for unknown tools", () => {
      render(
        <ToolActivityLine
          toolName="custom_tool"
          state="output-available"
          input={{ foo: "bar" }}
        />,
      );
      // Should not have the separator dot
      expect(screen.queryByText("·")).not.toBeInTheDocument();
    });

    it("omits summary when input is undefined", () => {
      render(
        <ToolActivityLine
          toolName="tmdb_search"
          state="input-streaming"
          input={undefined}
        />,
      );
      expect(screen.queryByText("·")).not.toBeInTheDocument();
    });
  });
});
