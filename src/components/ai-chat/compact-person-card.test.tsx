import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "#src/test-utils.tsx";
import { CompactPersonCard } from "./compact-person-card";

describe("CompactPersonCard", () => {
  it("renders person name", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: "Tom Hanks",
          profilePath: "/tom.jpg",
          knownForDepartment: "Acting",
        }}
      />,
    );

    expect(screen.getByText("Tom Hanks")).toBeInTheDocument();
  });

  it("renders known-for department", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: "Tom Hanks",
          profilePath: "/tom.jpg",
          knownForDepartment: "Acting",
        }}
      />,
    );

    expect(screen.getByText("Acting")).toBeInTheDocument();
  });

  it("omits department when knownForDepartment is null", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: "Tom Hanks",
          profilePath: "/tom.jpg",
          knownForDepartment: null,
        }}
      />,
    );

    expect(screen.queryByText("Acting")).not.toBeInTheDocument();
  });

  it("renders profile photo when profilePath is provided", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: "Tom Hanks",
          profilePath: "/tom.jpg",
          knownForDepartment: "Acting",
        }}
      />,
    );

    const img = screen.getByAltText("Tom Hanks");
    expect(img).toBeInTheDocument();
    expect(img.getAttribute("src")).toContain("/tom.jpg");
    expect(img.getAttribute("srcset")).toBeTruthy();
  });

  it("renders initial fallback when profilePath is null", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: "Tom Hanks",
          profilePath: null,
          knownForDepartment: "Acting",
        }}
      />,
    );

    // Should show the first character of the name
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("falls back to 'Person' label when name is null", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: null,
          profilePath: null,
          knownForDepartment: null,
        }}
      />,
    );

    expect(screen.getByText("Person")).toBeInTheDocument();
    // Initial fallback should use the first character of "Person"
    expect(screen.getByText("P")).toBeInTheDocument();
  });

  it("renders as a div when onClick is not provided", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: "Tom Hanks",
          profilePath: null,
          knownForDepartment: null,
        }}
      />,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders as a button when onClick is provided", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: "Tom Hanks",
          profilePath: null,
          knownForDepartment: null,
        }}
        onClick={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Tom Hanks" }),
    ).toBeInTheDocument();
  });

  it("calls onClick when clicked", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: "Tom Hanks",
          profilePath: null,
          knownForDepartment: null,
        }}
        onClick={onClick}
      />,
    );

    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("uses name as button aria-label", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: "Meryl Streep",
          profilePath: null,
          knownForDepartment: null,
        }}
        onClick={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Meryl Streep" }),
    ).toBeInTheDocument();
  });

  it("falls back to 'Person' aria-label when name is missing", () => {
    render(
      <CompactPersonCard
        person={{
          id: 1,
          name: null,
          profilePath: null,
          knownForDepartment: null,
        }}
        onClick={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "Person" })).toBeInTheDocument();
  });
});
