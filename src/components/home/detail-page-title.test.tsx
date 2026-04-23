import { describe, expect, it } from "vitest";
import { render } from "#src/test-utils.tsx";
import { DetailPageTitle } from "./detail-page-title";

describe("DetailPageTitle", () => {
  it("emits a machine-readable dateTime attribute alongside the visible string", () => {
    const { container } = render(
      <DetailPageTitle
        type="experience"
        title="Citadel"
        role="Software Engineer"
        date="Aug 2021 - Now"
        dateTime="2021-08"
      />,
    );

    const timeEl = container.querySelector("time");
    expect(timeEl).not.toBeNull();
    expect(timeEl).toHaveAttribute("datetime", "2021-08");
    expect(timeEl).toHaveTextContent("Aug 2021 - Now");
  });

  it("preserves the visible string exactly as passed", () => {
    const { container } = render(
      <DetailPageTitle
        type="education"
        title="University of Bristol"
        role="MSc Advanced Computing"
        date="Sep 2016 - Jan 2018"
        dateTime="2016-09"
      />,
    );

    const timeEl = container.querySelector("time");
    expect(timeEl?.textContent).toBe("Sep 2016 - Jan 2018");
    expect(timeEl).toHaveAttribute("datetime", "2016-09");
  });

  it("puts the primary h1 before the subordinate h2 in DOM order", () => {
    // WCAG 1.3.1 / 2.4.6: screen-reader heading navigation follows DOM
    // order. The h1 is the page's primary heading and must be reachable
    // first. The kicker-above-title visual order is preserved via flexbox
    // `order` in the stylesheet — don't swap the JSX back without also
    // re-introducing a layout workaround.
    const { container } = render(
      <DetailPageTitle
        type="experience"
        title="Citadel"
        role="Software Engineer"
        date="Aug 2021 - Now"
        dateTime="2021-08"
      />,
    );

    const headings = container.querySelectorAll("h1, h2");
    expect(headings).toHaveLength(2);
    expect(headings[0].tagName).toBe("H1");
    expect(headings[0]).toHaveTextContent("Software Engineer");
    expect(headings[1].tagName).toBe("H2");
    expect(headings[1]).toHaveTextContent("Experience - Citadel");
  });
});
