import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HeaderFooterLayout } from "./header-footer-layout.tsx";

// jsdom lays nothing out and never scrolls, so the page's offset is stubbed on
// the window; the bar's Scroll mask reads it through `usePageScrollMask`.
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

// The blur radius and the ramp land in inline CSS custom properties (StyleX
// dynamic styles), which jsdom preserves, so they are asserted through each
// layer's `style` attribute.
function maskLayers(container: HTMLElement) {
  const band = container.querySelector("[class*='mask-band__styles.band']");
  if (!band) throw new Error("the bar carries no Scroll mask band");
  return [...band.children];
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
    // Found by its own class: the bar's Scroll mask band is aria-hidden too,
    // so being hidden from assistive tech no longer names the background.
    expect(container.querySelector("[class*='styles.background']")).toBeNull();
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

describe("HeaderFooterLayout Scroll mask", () => {
  it("carries one band inside the bar, before the nav that stays crisp", () => {
    render(<HeaderFooterLayout>Body</HeaderFooterLayout>);
    const banner = screen.getByRole("banner");
    const band = banner.firstElementChild;

    expect(band?.className).toContain("mask-band__styles.band");
    expect(band?.getAttribute("aria-hidden")).toBe("true");
    // The nav follows the band in DOM order and is positioned, so the controls
    // paint above the layers instead of blurring beneath them.
    expect(banner.children[1].className).toContain("styles.headerNav");
  });

  it("spans the bar and reaches past its inner edge", () => {
    render(<HeaderFooterLayout>Body</HeaderFooterLayout>);
    const band = screen.getByRole("banner").firstElementChild;

    expect(band?.getAttribute("style") ?? "").toContain("calc(-1 *");
  });

  it("melts away while the page rests at the top", () => {
    const { container } = render(<HeaderFooterLayout>Body</HeaderFooterLayout>);

    for (const layer of maskLayers(container)) {
      expect(layer.getAttribute("style") ?? "").toContain("blur(0px)");
      expect(layer.className).toContain("mask-band__styles.hidden");
    }
  });

  it("blurs progressively down the bar once the page is scrolled", () => {
    const { container } = render(<HeaderFooterLayout>Body</HeaderFooterLayout>);

    scrollThePage(240);

    const styles = maskLayers(container).map(
      (layer) => layer.getAttribute("style") ?? "",
    );
    // Weakest first, compounding to the full radius against the viewport edge,
    // and every layer ramping down the bar rather than across it.
    expect(
      styles.map((style) => /blur\([\d.]+px\)/.exec(style)?.[0]),
    ).toStrictEqual([
      "blur(0.5px)",
      "blur(1px)",
      "blur(2px)",
      "blur(4px)",
      "blur(8px)",
    ]);
    for (const style of styles) {
      expect(style).toContain("linear-gradient(to bottom");
    }
    for (const layer of maskLayers(container)) {
      expect(layer.className).not.toContain("mask-band__styles.hidden");
    }
  });

  it("melts back when the page returns to the top", () => {
    const { container } = render(<HeaderFooterLayout>Body</HeaderFooterLayout>);

    scrollThePage(240);
    scrollThePage(0);

    for (const layer of maskLayers(container)) {
      expect(layer.getAttribute("style") ?? "").toContain("blur(0px)");
    }
  });

  it("masks the bar only — nothing scrolls under the footer", () => {
    const { container } = render(
      <HeaderFooterLayout footer={<footer>Colophon</footer>}>
        Body
      </HeaderFooterLayout>,
    );

    scrollThePage(240);

    expect(
      container.querySelectorAll("[class*='mask-band__styles.band']"),
    ).toHaveLength(1);
    expect(
      screen
        .getByRole("contentinfo")
        .querySelector("[class*='mask-band__styles.band']"),
    ).toBeNull();
  });
});
