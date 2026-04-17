import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaDetailProvider } from "./media-detail-context";
import { ToolMediaCards } from "./tool-media-cards";

const mockItems: ReadonlyArray<MediaListItem> = [
  {
    id: 1,
    title: "Inception",
    posterPath: "/inception.jpg",
    rating: 8.4,
    mediaType: "movie",
  },
  {
    id: 2,
    title: "Breaking Bad",
    posterPath: "/bb.jpg",
    rating: 9.5,
    mediaType: "tv",
  },
];

describe("ToolMediaCards", () => {
  it("renders a labeled, keyboard-focusable list", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards items={mockItems} />
      </MediaDetailProvider>,
    );

    const list = screen.getByRole("list", { name: "Search results" });
    expect(list).toHaveAttribute("tabindex", "0");
  });

  it("renders cards as buttons", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards items={mockItems} />
      </MediaDetailProvider>,
    );

    // One button per card, labelled with the media title.
    expect(
      screen.getByRole("button", { name: "Inception" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Breaking Bad" }),
    ).toBeInTheDocument();
  });

  it("renders poster images", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards items={mockItems} />
      </MediaDetailProvider>,
    );

    expect(screen.getByAltText("Inception")).toBeInTheDocument();
    expect(screen.getByAltText("Breaking Bad")).toBeInTheDocument();
  });

  it("returns null when items array is empty", () => {
    const { container } = render(
      <MediaDetailProvider>
        <ToolMediaCards items={[]} />
      </MediaDetailProvider>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("renders all cards when items share the same TMDB id but differ by media type", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards
          items={[
            {
              id: 123,
              title: "Same ID Movie",
              posterPath: "/movie.jpg",
              rating: 7.0,
              mediaType: "movie",
            },
            {
              id: 123,
              title: "Same ID TV Show",
              posterPath: "/tv.jpg",
              rating: 8.0,
              mediaType: "tv",
            },
          ]}
        />
      </MediaDetailProvider>,
    );

    expect(
      screen.getByRole("button", { name: "Same ID Movie" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Same ID TV Show" }),
    ).toBeInTheDocument();
  });

  it("renders cards without buttons when mediaType is null", () => {
    render(
      <MediaDetailProvider>
        <ToolMediaCards
          items={[
            {
              id: 99,
              title: "Unknown Type",
              posterPath: "/unknown.jpg",
              rating: 5.0,
              mediaType: null,
            },
          ]}
        />
      </MediaDetailProvider>,
    );

    // No media-card button for typeless items — the only buttons present
    // are the horizontal scroll chevrons (inert when the row doesn't
    // overflow, which is the jsdom case here).
    expect(
      screen.queryByRole("button", { name: "Unknown Type" }),
    ).not.toBeInTheDocument();
    expect(screen.getByAltText("Unknown Type")).toBeInTheDocument();
  });
});
