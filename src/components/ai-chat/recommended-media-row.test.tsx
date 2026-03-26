import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import type { MediaListItem } from "#src/utils/types.ts";
import { RecommendedMediaRow } from "./recommended-media-row";

const mockItems: ReadonlyArray<MediaListItem> = [
  {
    id: 1,
    title: "Movie One",
    posterPath: "/poster1.jpg",
    rating: 8.5,
    mediaType: "movie",
  },
  {
    id: 2,
    title: "Movie Two",
    posterPath: "/poster2.jpg",
    rating: 7.2,
    mediaType: "movie",
  },
];

describe("RecommendedMediaRow", () => {
  it("renders section title", () => {
    render(<RecommendedMediaRow title="Trending Movies" items={mockItems} />);
    expect(
      screen.getByRole("heading", { name: "Trending Movies" }),
    ).toBeInTheDocument();
  });

  it("renders poster images for each item", () => {
    render(<RecommendedMediaRow title="Trending Movies" items={mockItems} />);
    expect(screen.getByAltText("Movie One")).toBeInTheDocument();
    expect(screen.getByAltText("Movie Two")).toBeInTheDocument();
  });

  it("renders rating badges", () => {
    render(<RecommendedMediaRow title="Trending Movies" items={mockItems} />);
    expect(screen.getByText("8.5")).toBeInTheDocument();
    expect(screen.getByText("7.2")).toBeInTheDocument();
  });

  it("renders links to detail pages", () => {
    render(<RecommendedMediaRow title="Trending Movies" items={mockItems} />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/movie-database/movie/1");
    expect(links[1]).toHaveAttribute("href", "/movie-database/movie/2");
  });

  it("renders links for TV items with correct type", () => {
    render(
      <RecommendedMediaRow
        title="Trending TV Shows"
        items={[
          {
            id: 10,
            title: "TV Show One",
            posterPath: "/tv1.jpg",
            rating: 9.0,
            mediaType: "tv",
          },
        ]}
      />,
    );
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/movie-database/tv/10");
  });

  it("does not render link when mediaType is missing", () => {
    render(
      <RecommendedMediaRow
        title="Trending"
        items={[
          {
            id: 5,
            title: "Unknown Type",
            posterPath: "/unknown.jpg",
            rating: 7.0,
          },
        ]}
      />,
    );
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders no-poster fallback when posterPath is null", () => {
    render(
      <RecommendedMediaRow
        title="Trending Movies"
        items={[
          {
            id: 99,
            title: "No Poster Movie",
            posterPath: null,
            rating: 6.3,
            mediaType: "movie",
          },
        ]}
      />,
    );

    expect(screen.getByText("No Poster Movie")).toBeInTheDocument();
    expect(screen.getByText("No Poster")).toBeInTheDocument();
  });

  it("renders nothing when items array is empty", () => {
    const { container } = render(
      <RecommendedMediaRow title="Trending Movies" items={[]} />,
    );
    expect(container.querySelector("section")).toBeNull();
  });
});
