import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Divider } from "./divider.tsx";

describe("Divider orientation", () => {
  it("renders a semantic <hr> when horizontal", () => {
    render(<Divider />);
    const rule = screen.getByRole("separator");
    expect(rule.tagName).toBe("HR");
    expect(rule.className).toContain("styles.horizontal");
  });

  it("renders a role=separator <div> with a vertical orientation", () => {
    render(<Divider orientation="vertical" />);
    const rule = screen.getByRole("separator");
    expect(rule.tagName).toBe("DIV");
    expect(rule).toHaveAttribute("aria-orientation", "vertical");
    expect(rule.className).toContain("styles.vertical");
  });
});

describe("Divider variants", () => {
  it("applies distinct classes per variant", () => {
    const { container: subtle } = render(<Divider variant="subtle" />);
    const { container: decorative } = render(<Divider variant="decorative" />);
    expect(subtle.querySelector("hr")?.className).not.toBe(
      decorative.querySelector("hr")?.className,
    );
    expect(decorative.querySelector("hr")?.className).toContain("decorative");
  });
});

describe("Divider prop forwarding", () => {
  it("composes a caller css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(<Divider css={overrides.box} />);
    const rule = screen.getByRole("separator");
    expect(rule.className).toContain("overrides.box");
    expect(rule.className).toContain("styles.horizontal");
  });

  it("forwards a ref to the <hr> when horizontal", () => {
    const ref: { current: HTMLElement | null } = { current: null };
    render(<Divider ref={ref} />);
    expect(ref.current?.tagName).toBe("HR");
  });

  it("forwards a ref to the <div> when vertical", () => {
    const ref: { current: HTMLElement | null } = { current: null };
    render(<Divider orientation="vertical" ref={ref} />);
    expect(ref.current?.tagName).toBe("DIV");
  });
});
