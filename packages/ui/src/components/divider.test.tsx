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
  it("merges a caller className with the StyleX classes", () => {
    render(<Divider className="my-rule" />);
    const rule = screen.getByRole("separator");
    expect(rule.className).toContain("my-rule");
    expect(rule.className).toContain("styles.horizontal");
  });

  it("forwards inline style", () => {
    render(<Divider style={{ opacity: 0.5 }} />);
    expect(screen.getByRole("separator")).toHaveStyle({ opacity: "0.5" });
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
