import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
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
});
