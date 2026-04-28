import { describe, expect, it } from "vitest";
import { render } from "#src/test-utils.tsx";
import { EducationCard } from "./education-card";

describe("EducationCard", () => {
  it("emits dateTime on the <time> element for machine-readability", () => {
    const { container } = render(
      <EducationCard
        logo={<span data-testid="logo" />}
        name="University of Bristol"
        dates="Sep 2016 - Jan 2018"
        dateTime="2016-09"
        href="/education/university-of-bristol"
      />,
    );

    const timeEl = container.querySelector("time");
    expect(timeEl).not.toBeNull();
    expect(timeEl).toHaveAttribute("datetime", "2016-09");
    expect(timeEl).toHaveTextContent("Sep 2016 - Jan 2018");
  });
});
