import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { CompactMediaCard } from "./compact-media-card";

describe("CompactMediaCard", () => {
  it("renders poster image when posterPath is provided", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        }}
      />,
    );

    expect(screen.getByAltText("Inception")).toBeInTheDocument();
  });

  it("renders no-poster fallback when posterPath is null", () => {
    render(
      <CompactMediaCard
        media={{
          id: 2,
          title: "No Poster Movie",
          posterPath: null,
          rating: 6.0,
          mediaType: "movie",
        }}
      />,
    );

    expect(screen.getByText("No Poster Movie")).toBeInTheDocument();
    expect(screen.getByText("No Poster")).toBeInTheDocument();
  });

  it("renders rating badge", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        }}
      />,
    );

    expect(screen.getByText("8.4")).toBeInTheDocument();
    expect(screen.getByLabelText("User rating: 8.4")).toBeInTheDocument();
  });

  it("does not render rating badge when rating is null", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: null,
          mediaType: "movie",
        }}
      />,
    );

    expect(screen.queryByLabelText(/User rating/)).not.toBeInTheDocument();
  });

  it("renders as a link when href is provided", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        }}
        href="/movie-database/movie/1"
      />,
    );

    expect(screen.getByRole("link")).toHaveAttribute(
      "href",
      "/movie-database/movie/1",
    );
  });

  it("renders as a div when href is not provided", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        }}
      />,
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
