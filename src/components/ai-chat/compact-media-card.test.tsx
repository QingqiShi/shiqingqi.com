import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { CompactMediaCard } from "./compact-media-card";

describe("CompactMediaCard", () => {
  it("renders the poster image when posterPath is provided (non-interactive: alt names the image)", () => {
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

    // Without onClick the card is an unlabelled <div>, so the img's alt is
    // still the title — it's the only accessible name for the image.
    expect(screen.getByAltText("Inception")).toBeInTheDocument();
  });

  it("renders the poster image with empty alt when wrapped in a labelled button", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        }}
        onClick={vi.fn()}
      />,
    );

    // Title is already on the button's aria-label; repeating it via the img
    // alt would cause duplicate announcements.
    const img = screen.getByRole("button").querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("alt", "");
    expect(screen.queryByAltText("Inception")).not.toBeInTheDocument();
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

  it("renders as a div when onClick is not provided", () => {
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

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders as a button when onClick is provided", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <CompactMediaCard
        media={{
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        }}
        onClick={onClick}
      />,
    );

    await user.click(screen.getByRole("button"));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses title as button aria-label when available", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          title: "Inception",
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        }}
        onClick={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Inception" }),
    ).toBeInTheDocument();
  });

  it("falls back to 'Movie' aria-label when title is missing for movie", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          posterPath: "/inception.jpg",
          rating: 8.4,
          mediaType: "movie",
        }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Movie" })).toBeInTheDocument();
  });

  it("falls back to 'TV show' aria-label when title is missing for tv", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          posterPath: "/show.jpg",
          rating: 7.0,
          mediaType: "tv",
        }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "TV show" })).toBeInTheDocument();
  });

  it("falls back to 'Media' aria-label when title and mediaType are missing", () => {
    render(
      <CompactMediaCard
        media={{
          id: 1,
          posterPath: "/unknown.jpg",
          rating: 5.0,
        }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Media" })).toBeInTheDocument();
  });
});
