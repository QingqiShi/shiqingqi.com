import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { HeaderFooterLayout } from "./header-footer-layout.tsx";

describe("HeaderFooterLayout structure", () => {
  it("renders the header slots, the content, and the footer element as passed", () => {
    // The consumer supplies the footer element (and its landmark); the shell
    // renders it verbatim rather than wrapping it in a second <footer>.
    render(
      <HeaderFooterLayout
        headerStart={<span>Back</span>}
        headerEnd={<span>Utilities</span>}
        footer={<footer>Colophon</footer>}
      >
        Body
      </HeaderFooterLayout>,
    );
    const banner = screen.getByRole("banner");
    expect(banner).toContainElement(screen.getByText("Back"));
    expect(banner).toContainElement(screen.getByText("Utilities"));
    expect(screen.getByText("Body")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toContainElement(
      screen.getByText("Colophon"),
    );
  });

  it("renders no footer element when no footer is passed", () => {
    render(<HeaderFooterLayout>Body</HeaderFooterLayout>);
    expect(screen.queryByRole("contentinfo")).toBeNull();
  });

  it("renders the background slot behind the content, hidden from assistive tech", () => {
    render(
      <HeaderFooterLayout background={<div>Decoration</div>}>
        Body
      </HeaderFooterLayout>,
    );
    const decoration = screen.getByText("Decoration");
    expect(decoration).toBeInTheDocument();
    // The decoration wrapper is aria-hidden so screen readers skip it.
    expect(decoration.closest("[aria-hidden='true']")).not.toBeNull();
  });

  it("omits the background layer when no background is passed", () => {
    const { container } = render(<HeaderFooterLayout>Body</HeaderFooterLayout>);
    expect(container.querySelector("[aria-hidden='true']")).toBeNull();
  });
});

describe("HeaderFooterLayout content landmark", () => {
  it("wraps the content in a <main> landmark by default", () => {
    render(<HeaderFooterLayout>Body</HeaderFooterLayout>);
    const main = screen.getByRole("main");
    expect(main).toContainElement(screen.getByText("Body"));
  });

  it("renders a plain <div> region when as='div'", () => {
    render(<HeaderFooterLayout as="div">Body</HeaderFooterLayout>);
    expect(screen.queryByRole("main")).toBeNull();
    expect(screen.getByText("Body")).toBeInTheDocument();
  });
});

describe("HeaderFooterLayout tuning props", () => {
  it("caps the content into a reading column when contentMaxInlineSize is passed", () => {
    render(
      <HeaderFooterLayout contentMaxInlineSize="480px">
        Body
      </HeaderFooterLayout>,
    );
    const column = screen.getByText("Body").closest("[style*='480px']");
    expect(column).not.toBeNull();
  });

  it("leaves the content full-bleed when contentMaxInlineSize is omitted", () => {
    render(<HeaderFooterLayout>Body</HeaderFooterLayout>);
    expect(screen.getByRole("main").getAttribute("style")).toBeNull();
  });
});
