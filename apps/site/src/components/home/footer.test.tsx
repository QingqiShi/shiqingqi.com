import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { CurrentYear } from "./current-year";
import { Footer } from "./footer";

describe("CurrentYear", () => {
  it("renders the runtime year from the client clock", () => {
    const { container } = render(<CurrentYear initialYear={1970} />);
    expect(container.textContent).toBe(String(new Date().getFullYear()));
  });
});

describe("Footer", () => {
  it("displays the current copyright year", () => {
    render(<Footer locale="en" />);
    const year = String(new Date().getFullYear());
    expect(screen.getByText(`© ${year}`)).toBeInTheDocument();
  });
});
