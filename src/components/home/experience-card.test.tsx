import { describe, expect, it } from "vitest";
import { render } from "#src/test-utils.tsx";
import { ExperienceCard } from "./experience-card";

describe("ExperienceCard", () => {
  it("emits dateTime on the <time> element for machine-readability", () => {
    const { container } = render(
      <ExperienceCard
        logo={<span data-testid="logo" />}
        dates="Aug 2021 - Now"
        dateTime="2021-08"
        href="/experiences/citadel"
      />,
    );

    const timeEl = container.querySelector("time");
    expect(timeEl).not.toBeNull();
    expect(timeEl).toHaveAttribute("datetime", "2021-08");
    expect(timeEl).toHaveTextContent("Aug 2021 - Now");
  });
});
