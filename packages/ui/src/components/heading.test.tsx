import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Heading } from "./heading.tsx";

describe("Heading level selection", () => {
  it("renders an <h2> by default", () => {
    render(<Heading>Title</Heading>);
    const el = screen.getByRole("heading", { name: "Title" });
    expect(el.tagName).toBe("H2");
    expect(el.className).toContain("styles.base");
  });

  it("renders the semantic element matching the level", () => {
    for (const level of [1, 2, 3, 4, 5, 6] as const) {
      const { getByRole, unmount } = render(
        <Heading level={level}>Rank {level}</Heading>,
      );
      expect(getByRole("heading", { level }).tagName).toBe(`H${String(level)}`);
      unmount();
    }
  });
});

describe("Heading variant decoupling", () => {
  it("keeps the semantic level while applying a different visual ramp", () => {
    render(
      <Heading level={2} variant="display">
        Big h2
      </Heading>,
    );
    const el = screen.getByRole("heading", { level: 2 });
    expect(el.tagName).toBe("H2");
    expect(el.className).toContain("variantStyles.display");
  });
});

describe("Heading prop forwarding", () => {
  it("merges a caller className with the StyleX classes", () => {
    render(<Heading className="my-heading">Title</Heading>);
    const el = screen.getByRole("heading");
    expect(el.className).toContain("my-heading");
    expect(el.className).toContain("styles.base");
  });

  it("forwards inline style", () => {
    render(<Heading style={{ opacity: 0.5 }}>Title</Heading>);
    expect(screen.getByRole("heading")).toHaveStyle({ opacity: "0.5" });
  });

  it("forwards a ref to the heading element", () => {
    const ref: { current: HTMLHeadingElement | null } = { current: null };
    render(
      <Heading level={3} ref={ref}>
        Title
      </Heading>,
    );
    expect(ref.current?.tagName).toBe("H3");
  });
});
