import { describe, expect, it } from "vitest";
import { render, screen } from "#src/test-utils.tsx";
import { CurrentYear } from "./current-year";
import { Footer } from "./footer";

describe("CurrentYear", () => {
  it("renders the current year from the runtime clock", () => {
    const { container } = render(<CurrentYear />);
    expect(container.textContent).toBe(String(new Date().getFullYear()));
  });
});

describe("Footer", () => {
  it("displays the current copyright year", () => {
    render(<Footer locale="en" />);
    const year = new Date().getFullYear();
    expect(screen.getByText(`© ${year}`)).toBeInTheDocument();
  });
});
