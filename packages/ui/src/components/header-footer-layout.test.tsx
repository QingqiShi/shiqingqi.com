import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HeaderFooterLayout } from "./header-footer-layout.tsx";

// jsdom lays nothing out and never scrolls, so the page's offset is stubbed on
// the window; the floating controls read it through `usePageScrolled`.
function scrollThePage(scrollY: number) {
  Object.defineProperty(window, "scrollY", {
    value: scrollY,
    configurable: true,
  });
  act(() => {
    window.dispatchEvent(new Event("scroll"));
  });
}

afterEach(() => {
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

// The header is `display: contents`, so the banner's children are the groups.
function controlGroups() {
  return [...screen.getByRole("banner").children];
}

// The blur radius lands in an inline CSS custom property (a StyleX dynamic
// style), which jsdom preserves, so it is asserted through each layer's
// `style` attribute. The layers are the only elements inside a group hidden
// from assistive technology.
function blurLayers() {
  const layers = controlGroups().flatMap((group) => [
    ...group.querySelectorAll('[aria-hidden="true"]'),
  ]);
  if (layers.length === 0) throw new Error("no control group blurs the page");
  return layers;
}

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
    // Found by its own class: a blur's layers are aria-hidden too, so being
    // hidden from assistive tech no longer names the background.
    expect(
      container.querySelector(
        "[class*='header-footer-layout__styles.background']",
      ),
    ).toBeNull();
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

describe("HeaderFooterLayout floating controls", () => {
  it("floats each slot in its own box inside the banner, start before end", () => {
    render(
      <HeaderFooterLayout
        headerStart={<span>Back</span>}
        headerEnd={<span>Utilities</span>}
      >
        Body
      </HeaderFooterLayout>,
    );
    const groups = controlGroups();

    // A box per group rather than one bar — see "Progressive blur" in
    // `CONTEXT.md` for what a near-full-width fixed element costs on iOS.
    expect(groups).toHaveLength(2);
    expect(groups[0]).toContainElement(screen.getByText("Back"));
    expect(groups[1]).toContainElement(screen.getByText("Utilities"));
  });

  it("renders no box for a slot that was left out", () => {
    render(
      <HeaderFooterLayout headerStart={<span>Back</span>}>
        Body
      </HeaderFooterLayout>,
    );
    const groups = controlGroups();

    expect(groups).toHaveLength(1);
    expect(groups[0]).toContainElement(screen.getByText("Back"));
  });

  it("blurs the page around the controls only while it is scrolled", () => {
    render(
      <HeaderFooterLayout headerStart={<span>Back</span>}>
        Body
      </HeaderFooterLayout>,
    );

    scrollThePage(240);
    for (const layer of blurLayers()) {
      expect(layer.className).not.toContain("progressive-blur__styles.hidden");
    }

    scrollThePage(0);
    for (const layer of blurLayers()) {
      expect(layer.className).toContain("progressive-blur__styles.hidden");
      expect(layer.getAttribute("style") ?? "").toContain("blur(0px)");
    }
  });

  it("blurs around the header controls only — nothing floats over the footer", () => {
    render(
      <HeaderFooterLayout
        headerStart={<span>Back</span>}
        footer={<footer>Colophon</footer>}
      >
        Body
      </HeaderFooterLayout>,
    );

    scrollThePage(240);

    expect(controlGroups()).toHaveLength(1);
    expect(
      screen
        .getByRole("contentinfo")
        .querySelector("[class*='progressive-blur__styles.root']"),
    ).toBeNull();
  });
});
