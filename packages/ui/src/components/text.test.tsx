import * as stylex from "@stylexjs/stylex";
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
  it("applies the overline step", () => {
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
  it("composes a caller css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(<Text css={overrides.box}>Copy</Text>);
    const el = screen.getByText("Copy");
    expect(el.className).toContain("overrides.box");
    expect(el.className).toContain("styles.base");
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

describe("Text wrapping and figures", () => {
  it.each(["balance", "pretty", "nowrap"] as const)(
    "applies the %s wrap style",
    (wrap) => {
      render(<Text wrap={wrap}>Copy</Text>);

      expect(screen.getByText("Copy").className).toContain(
        `wrapStyles.${wrap}`,
      );
    },
  );

  it("leaves wrapping to the browser by default", () => {
    render(<Text>Copy</Text>);

    expect(screen.getByText("Copy").className).not.toContain("wrapStyles.");
  });

  it("switches to tabular figures when numeric", () => {
    render(<Text numeric>09:45</Text>);

    expect(screen.getByText("09:45").className).toContain("styles.numeric");
  });

  it("keeps proportional figures by default", () => {
    render(<Text>09:45</Text>);

    expect(screen.getByText("09:45").className).not.toContain("styles.numeric");
  });
});
