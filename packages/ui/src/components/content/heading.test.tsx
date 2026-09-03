import * as stylex from "@stylexjs/stylex";
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
  it("keeps the semantic level while applying a different visual step", () => {
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

describe("Heading weight override", () => {
  it("applies the weight override on top of the variant step", () => {
    render(
      <Heading level={1} weight="regular">
        Light title
      </Heading>,
    );
    const el = screen.getByRole("heading", { level: 1 });
    expect(el.className).toContain("variantStyles.h1");
    expect(el.className).toContain("weightStyles.regular");
  });

  it("does not apply a weight override when weight is unset", () => {
    render(<Heading level={1}>Title</Heading>);
    expect(screen.getByRole("heading", { level: 1 }).className).not.toContain(
      "weightStyles",
    );
  });
});

describe("Heading prop forwarding", () => {
  it("composes a caller css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(<Heading css={overrides.box}>Title</Heading>);
    const el = screen.getByRole("heading");
    expect(el.className).toContain("overrides.box");
    expect(el.className).toContain("styles.base");
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

describe("Heading wrapping", () => {
  it.each(["balance", "pretty", "nowrap"] as const)(
    "applies the %s wrap style",
    (wrap) => {
      render(<Heading wrap={wrap}>Tuscany by car</Heading>);

      expect(screen.getByRole("heading").className).toContain(
        `wrapStyles.${wrap}`,
      );
    },
  );

  it("leaves wrapping to the browser by default", () => {
    render(<Heading>Tuscany by car</Heading>);

    expect(screen.getByRole("heading").className).not.toContain("wrapStyles.");
  });
});
