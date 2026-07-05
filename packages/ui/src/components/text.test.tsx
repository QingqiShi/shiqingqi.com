import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Text } from "./text.tsx";

describe("Text element selection", () => {
  it("renders a <p> by default", () => {
    render(<Text>Body</Text>);
    const el = screen.getByText("Body");
    expect(el.tagName).toBe("P");
    expect(el.className).toContain("styles.base");
  });

  it("renders a <span> when as='span'", () => {
    render(<Text as="span">Inline</Text>);
    expect(screen.getByText("Inline").tagName).toBe("SPAN");
  });

  it("renders a <div> when as='div'", () => {
    render(<Text as="div">Block</Text>);
    expect(screen.getByText("Block").tagName).toBe("DIV");
  });
});

describe("Text variant and modifier classes", () => {
  it("applies the overline ramp", () => {
    render(<Text variant="overline">Label</Text>);
    expect(screen.getByText("Label").className).toContain(
      "variantStyles.overline",
    );
  });

  it("applies the requested tone", () => {
    render(<Text tone="muted">Muted</Text>);
    expect(screen.getByText("Muted").className).toContain("toneStyles.muted");
  });

  it("applies a case transform decoupled from the variant", () => {
    render(
      <Text variant="caption" transform="uppercase">
        Eyebrow
      </Text>,
    );
    const el = screen.getByText("Eyebrow");
    expect(el.className).toContain("variantStyles.caption");
    expect(el.className).toContain("transformStyles.uppercase");
  });

  it("applies alignment", () => {
    render(<Text align="center">Centered</Text>);
    expect(screen.getByText("Centered").className).toContain(
      "alignStyles.center",
    );
  });

  it("defaults overline to a semibold weight", () => {
    render(<Text variant="overline">Label</Text>);
    expect(screen.getByText("Label").className).toContain(
      "weightStyles.semibold",
    );
  });
});

describe("Text prop forwarding", () => {
  it("merges a caller className with the StyleX classes", () => {
    render(<Text className="my-text">Copy</Text>);
    const el = screen.getByText("Copy");
    expect(el.className).toContain("my-text");
    expect(el.className).toContain("styles.base");
  });

  it("forwards inline style", () => {
    render(<Text style={{ opacity: 0.5 }}>Copy</Text>);
    expect(screen.getByText("Copy")).toHaveStyle({ opacity: "0.5" });
  });

  it("forwards a ref to the rendered element", () => {
    const ref: { current: HTMLElement | null } = { current: null };
    render(<Text ref={ref}>Copy</Text>);
    expect(ref.current?.tagName).toBe("P");
  });

  it("forwards a ref to the element chosen by 'as'", () => {
    const ref: { current: HTMLElement | null } = { current: null };
    render(
      <Text as="span" ref={ref}>
        Copy
      </Text>,
    );
    expect(ref.current?.tagName).toBe("SPAN");
  });
});
