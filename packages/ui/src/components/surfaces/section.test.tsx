import * as stylex from "@stylexjs/stylex";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Section } from "./section.tsx";

describe("Section", () => {
  it("labels the block with a real heading", () => {
    render(<Section title="Dining">Two options</Section>);

    expect(
      screen.getByRole("heading", { name: "Dining", level: 3 }),
    ).toBeInTheDocument();
  });

  it("renders its children", () => {
    render(<Section title="Dining">Two options</Section>);

    expect(screen.getByText("Two options")).toBeInTheDocument();
  });

  it("honours an explicit heading level", () => {
    render(
      <Section title="Dining" level={2}>
        Two options
      </Section>,
    );

    expect(
      screen.getByRole("heading", { name: "Dining", level: 2 }),
    ).toBeInTheDocument();
  });

  it("keeps the icon out of the heading's accessible name", () => {
    render(
      <Section title="Dining" icon={<span data-testid="icon" />}>
        Two options
      </Section>,
    );

    expect(screen.getByTestId("icon").parentElement).toHaveAttribute(
      "aria-hidden",
    );
    expect(screen.getByRole("heading", { name: "Dining" })).toBeInTheDocument();
  });

  it("keeps actions interactive and announced", () => {
    render(
      <Section title="Dining" actions={<button type="button">See all</button>}>
        Two options
      </Section>,
    );

    expect(screen.getByRole("button", { name: "See all" })).toBeInTheDocument();
  });

  it("renders no slot for an icon or actions that resolve to nothing", () => {
    function Dining({ canEdit }: { canEdit: boolean }) {
      return (
        <Section
          title="Dining"
          icon={canEdit && <span />}
          actions={canEdit && <button type="button">See all</button>}
          data-testid="section"
        >
          Two options
        </Section>
      );
    }
    render(<Dining canEdit={false} />);

    // The header should hold the heading alone — an empty icon or actions box
    // would still take the header's gap.
    const header = screen.getByTestId("section").firstElementChild;
    expect(header?.children).toHaveLength(1);
  });

  it("renders a section landmark that a caller can name", () => {
    render(
      <Section title="Dining" aria-label="Dining options">
        Two options
      </Section>,
    );

    expect(
      screen.getByRole("region", { name: "Dining options" }),
    ).toBeInTheDocument();
  });

  it("adds the top rule only when asked", () => {
    const { rerender } = render(
      <Section title="Dining" data-testid="section">
        Two options
      </Section>,
    );
    expect(screen.getByTestId("section").className).not.toContain(
      "styles.divided",
    );

    rerender(
      <Section title="Dining" divider data-testid="section">
        Two options
      </Section>,
    );
    expect(screen.getByTestId("section").className).toContain("styles.divided");
  });

  it("styles the label from its own rules rather than a composed Heading", () => {
    render(<Section title="Dining">Two options</Section>);

    const heading = screen.getByRole("heading", { name: "Dining" });
    expect(heading.className).toContain("styles.title");
    // Composing `Heading` here would put the label's font-size and colour in a
    // second `stylex.props` call, leaving which declaration wins up to
    // stylesheet order instead of composition order.
    expect(heading.className).not.toContain("variantStyles.");
  });

  it("composes a caller css override last", () => {
    const overrides = stylex.create({ box: { opacity: 0.9 } });
    render(
      <Section title="Dining" css={overrides.box} data-testid="section">
        Two options
      </Section>,
    );

    expect(screen.getByTestId("section").className).toContain("overrides.box");
  });
});
