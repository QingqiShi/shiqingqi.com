import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { DetailPageTitle } from "./detail-page-title";

describe("DetailPageTitle", () => {
  it("uses h1 for the page topic line and h2 for the role, in DOM order", () => {
    render(
      <DetailPageTitle
        type="experience"
        title="Citadel"
        role="Software Engineer"
        date="Aug 2021 - Now"
      />,
    );

    const headings = screen.getAllByRole("heading");
    expect(headings).toHaveLength(2);
    expect(headings[0].tagName).toBe("H1");
    expect(headings[0]).toHaveTextContent("Experience - Citadel");
    expect(headings[1].tagName).toBe("H2");
    expect(headings[1]).toHaveTextContent("Software Engineer");
  });

  it("uses the education type label when type is 'education'", () => {
    render(
      <DetailPageTitle
        type="education"
        title="University of Bristol"
        role="MSc Advanced Computing"
        date="2018 - 2019"
      />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Education - University of Bristol",
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent(
      "MSc Advanced Computing",
    );
  });
});
