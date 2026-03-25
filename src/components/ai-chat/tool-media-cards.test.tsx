import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
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
  it("renders cards with correct links", () => {
    render(<ToolMediaCards items={mockItems} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/movie-database/movie/1");
    expect(links[1]).toHaveAttribute("href", "/movie-database/tv/2");
  });

  it("renders poster images", () => {
    render(<ToolMediaCards items={mockItems} />);

    expect(screen.getByAltText("Inception")).toBeInTheDocument();
    expect(screen.getByAltText("Breaking Bad")).toBeInTheDocument();
  });

  it("returns null when items array is empty", () => {
    const { container } = render(<ToolMediaCards items={[]} />);

    expect(container.innerHTML).toBe("");
  });

  it("renders cards without links when mediaType is null", () => {
    render(
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
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByAltText("Unknown Type")).toBeInTheDocument();
  });
});
