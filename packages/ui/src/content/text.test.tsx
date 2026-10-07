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

describe("Text look and modifier classes", () => {
  it("applies the overline type role", () => {
    render(<Text look="overline">Label</Text>);
    expect(screen.getByText("Label").className).toContain("typeRole.overline");
  });

  it("applies the requested tone", () => {
    render(<Text tone="muted">Muted</Text>);
    expect(screen.getByText("Muted").className).toContain("toneStyles.muted");
  });

  it("applies a case transform decoupled from the look", () => {
    render(
      <Text look="caption" transform="uppercase">
        Eyebrow
      </Text>,
    );
    const el = screen.getByText("Eyebrow");
    expect(el.className).toContain("typeRole.caption");
    expect(el.className).toContain("transformStyles.uppercase");
  });

  it("applies alignment", () => {
    render(<Text align="center">Centered</Text>);
    expect(screen.getByText("Centered").className).toContain(
      "alignStyles.center",
    );
  });

  it("takes the weight from the type role when weight is unset", () => {
    render(<Text look="overline">Label</Text>);
    expect(screen.getByText("Label").className).not.toContain("weightStyles.");
  });

  it("applies the label type role", () => {
    render(<Text look="label">Label</Text>);
    expect(screen.getByText("Label").className).toContain("typeRole.label");
  });
});

describe("Text Measure", () => {
  it("caps a body paragraph at the prose Measure", () => {
    render(<Text>Paragraph</Text>);
    expect(screen.getByText("Paragraph").className).toContain(
      "measureStyles.start",
    );
  });

  it("caps a bodySmall paragraph at the prose Measure", () => {
    render(<Text look="bodySmall">Paragraph</Text>);
    expect(screen.getByText("Paragraph").className).toContain(
      "measureStyles.start",
    );
  });

  it("keeps a centred paragraph's capped box centred", () => {
    render(<Text align="center">Centred</Text>);
    expect(screen.getByText("Centred").className).toContain(
      "measureStyles.center",
    );
  });

  it.each([
    { label: "span", props: { as: "span" } as const },
    { label: "div", props: { as: "div" } as const },
    { label: "caption", props: { look: "caption" } as const },
    { label: "overline", props: { look: "overline" } as const },
  ])("leaves a $label uncapped", ({ props }) => {
    render(<Text {...props}>Label</Text>);
    expect(screen.getByText("Label").className).not.toContain("measureStyles");
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

    expect(screen.getByText("09:45").className).toContain(
      "typeModifier.numeric",
    );
  });

  it("keeps proportional figures by default", () => {
    render(<Text>09:45</Text>);

    expect(screen.getByText("09:45").className).not.toContain(
      "typeModifier.numeric",
    );
  });
});
