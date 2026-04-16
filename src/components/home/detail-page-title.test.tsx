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
});
