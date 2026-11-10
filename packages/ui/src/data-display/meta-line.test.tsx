import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetaLine } from "./meta-line.tsx";

describe("MetaLine", () => {
  it("puts one separator between two shown facts and none for skipped ones", () => {
    const due = null;
    render(
      <p data-testid="line">
        <MetaLine facts={["Gmail", due, false, "", "Last checked 9:30"]} />
      </p>,
    );
    expect(screen.getByTestId("line")).toHaveTextContent(
      /^Gmail\s*\S\s*Last checked 9:30$/,
    );
  });
});
