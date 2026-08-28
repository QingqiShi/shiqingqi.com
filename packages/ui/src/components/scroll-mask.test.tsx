import { render, screen } from "@testing-library/react";
import { createRef, type ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { buildEdgeBlurLayers } from "./progressive-blur-masks.ts";
import { ScrollMask } from "./scroll-mask.tsx";

describe("buildEdgeBlurLayers", () => {
  it("holds the strongest layer opaque at the edge and gone one band in", () => {
    const [, , , , strongest] = buildEdgeBlurLayers({
      direction: "to bottom",
      radius: 8,
      isShown: true,
    });

    expect(strongest.mask).toBe(
      "linear-gradient(to bottom, #000 0%, transparent 20%)",
    );
  });

  it("runs the weakest layer out to the full depth of the band", () => {
    const [weakest] = buildEdgeBlurLayers({
      direction: "to bottom",
      radius: 8,
      isShown: true,
    });

    expect(weakest.mask).toBe(
      "linear-gradient(to bottom, #000 80%, transparent 100%)",
    );
  });

  it("ramps along the direction it is given and no other axis", () => {
    const layers = buildEdgeBlurLayers({
      direction: "to left",
      radius: 8,
      isShown: true,
    });

    for (const layer of layers) {
      expect(layer.mask).toContain("to left");
      expect(layer.mask.split("linear-gradient")).toHaveLength(2);
    }
  });

  it("doubles each layer's radius up to the full radius at the edge", () => {
    const layers = buildEdgeBlurLayers({
      direction: "to bottom",
      radius: 16,
      isShown: true,
    });

    expect(layers.map((one) => one.filter)).toStrictEqual([
      "blur(1px)",
      "blur(2px)",
      "blur(4px)",
      "blur(8px)",
      "blur(16px)",
    ]);
  });

  it("clamps the radius to the cap", () => {
    const layers = buildEdgeBlurLayers({
      direction: "to bottom",
      radius: 64,
      isShown: true,
    });

    expect(layers[4]?.filter).toBe("blur(32px)");
  });

  it("melts every layer to no blur when the edge is not shown", () => {
    const layers = buildEdgeBlurLayers({
      direction: "to bottom",
      radius: 16,
      isShown: false,
    });

    expect(layers.map((one) => one.filter)).toStrictEqual([
      "blur(0px)",
      "blur(0px)",
      "blur(0px)",
      "blur(0px)",
      "blur(0px)",
    ]);
  });
});

function renderMask(
  props?: Omit<ComponentProps<typeof ScrollMask>, "children">,
) {
  const { container } = render(
    <ScrollMask {...props}>
      <span>content</span>
    </ScrollMask>,
  );
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("ScrollMask rendered nothing");
  }
  return root;
}

function bandElements(root: HTMLElement) {
  return [...root.querySelectorAll('[aria-hidden="true"]')];
}

// The band count itself is asserted separately, so this only names the two.
function bandsOf(root: HTMLElement) {
  const [start, end] = bandElements(root);
  return { start, end };
}

// The blur radius and the ramp land in inline CSS custom properties (StyleX
// dynamic styles), which jsdom preserves, so they are asserted through each
// layer's `style` attribute. jsdom lays nothing out, so everything else is
// asserted through the classes the css-prop transform generates.
function layerStyles(band: Element) {
  return [...band.children].map((layer) => layer.getAttribute("style") ?? "");
}

describe("ScrollMask", () => {
  it("renders its children inside the scroller", () => {
    renderMask();

    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("applies the vertical scroll styles by default", () => {
    const scroller = renderMask().firstElementChild;

    expect(scroller?.className).toContain("styles.scrollerVertical");
    expect(scroller?.className).not.toContain("styles.scrollerHorizontal");
  });

  it("applies the horizontal scroll styles when horizontal", () => {
    const scroller = renderMask({
      orientation: "horizontal",
    }).firstElementChild;

    expect(scroller?.className).toContain("styles.scrollerHorizontal");
    expect(scroller?.className).not.toContain("styles.scrollerVertical");
  });

  // Without `position: relative` on the root the bands would be placed against
  // whatever positioned ancestor happens to be further up the page.
  it("keeps its own positioning styles on the root", () => {
    expect(renderMask().className).toContain("styles.root");
  });

  // The root carries the consumer's corners and never clips; the scroller
  // rounds its own overflow clip to them, over anything `contentCss` sets.
  it("rounds the scroller's clip to the root's corners, over the content styles", () => {
    const scroller = renderMask().firstElementChild;

    expect(scroller?.className).toContain("styles.scrollerCorners");
  });

  it("forwards a ref to the scroller, not the root", () => {
    const ref = createRef<HTMLDivElement>();
    const root = renderMask({ ref });

    expect(ref.current).toBe(screen.getByText("content").parentElement);
    expect(ref.current).not.toBe(root);
  });

  it("passes native div attributes through to the scroller", () => {
    renderMask({ role: "region", "aria-label": "cards", tabIndex: 0 });

    const scroller = screen.getByRole("region", { name: "cards" });
    expect(scroller).toHaveAttribute("tabindex", "0");
    expect(scroller).toContainElement(screen.getByText("content"));
  });

  it("renders one band per edge beside the scroller, hidden from assistive technology", () => {
    const root = renderMask();
    const bands = bandElements(root);

    expect(bands).toHaveLength(2);
    for (const band of bands) {
      expect(band.parentElement).toBe(root);
      expect(band.className).toContain("styles.band");
      expect(band.children).toHaveLength(5);
    }
  });

  it("sizes a bare edge's band to the depth", () => {
    const { start, end } = bandsOf(renderMask({ depth: "40px" }));

    expect(start.getAttribute("style") ?? "").toContain("40px");
    expect(end.getAttribute("style") ?? "").toContain("40px");
  });

  it("ramps each band away from its own edge", () => {
    const { start, end } = bandsOf(
      renderMask({ showStartMask: true, showEndMask: true }),
    );

    expect(start.className).toContain("styles.bandBlockStart");
    expect(end.className).toContain("styles.bandBlockEnd");
    for (const layer of layerStyles(start)) {
      expect(layer).toContain("to bottom");
    }
    for (const layer of layerStyles(end)) {
      expect(layer).toContain("to top");
    }
  });

  // Each band and each of its layers inherit the region's two corners on
  // their edge — the block-start band the start-start and start-end corners,
  // the block-end band the end-start and end-end ones — so the layers clip
  // their own backdrop and no ancestor has to. jsdom lays nothing out, so the
  // class is the handle.
  it("gives each band and its layers the region's corners on its edge", () => {
    const { start, end } = bandsOf(renderMask());

    expect(start.className).toContain("corners.blockStart");
    expect(end.className).toContain("corners.blockEnd");
    for (const layer of start.children) {
      expect(layer.className).toContain("corners.blockStart");
    }
    for (const layer of end.children) {
      expect(layer.className).toContain("corners.blockEnd");
    }
  });

  it("places the bands on the inline edges when horizontal", () => {
    const { start, end } = bandsOf(
      renderMask({
        orientation: "horizontal",
        showStartMask: true,
        showEndMask: true,
      }),
    );

    expect(start.className).toContain("styles.bandInlineStart");
    expect(end.className).toContain("styles.bandInlineEnd");
    for (const layer of layerStyles(start)) {
      expect(layer).toContain("to right");
    }
    for (const layer of layerStyles(end)) {
      expect(layer).toContain("to left");
    }
  });

  it("gives the horizontal bands the inline edges' corners", () => {
    const { start, end } = bandsOf(renderMask({ orientation: "horizontal" }));

    expect(start.className).toContain("corners.inlineStart");
    expect(end.className).toContain("corners.inlineEnd");
    for (const layer of start.children) {
      expect(layer.className).toContain("corners.inlineStart");
    }
    for (const layer of end.children) {
      expect(layer.className).toContain("corners.inlineEnd");
    }
  });

  it("blurs an edge up to the requested radius when it is shown", () => {
    const { start } = bandsOf(
      renderMask({ radius: 16, showStartMask: true, showEndMask: false }),
    );
    const layers = layerStyles(start);

    expect(layers[0]).toContain("blur(1px)");
    expect(layers[4]).toContain("blur(16px)");
  });

  // "It never appears where nothing scrolls": jsdom lays nothing out, so
  // nothing overflows, so both edges rest unmasked — the same state a region
  // whose content fits reaches in a browser.
  it("melts an edge away instead of unmounting it when nothing scrolls", () => {
    const bands = bandElements(renderMask({ radius: 16 }));

    expect(bands).toHaveLength(2);
    for (const band of bands) {
      for (const layer of band.children) {
        expect(layer.className).toContain("styles.hidden");
        expect(layer.getAttribute("style") ?? "").toContain("blur(0px)");
      }
    }
  });

  it("leaves a shown edge visible while the other stays melted away", () => {
    const { start, end } = bandsOf(
      renderMask({ showStartMask: true, showEndMask: false }),
    );

    for (const layer of start.children) {
      expect(layer.className).not.toContain("styles.hidden");
    }
    for (const layer of end.children) {
      expect(layer.className).toContain("styles.hidden");
    }
  });
});

describe("ScrollMask chrome slots", () => {
  function renderChromeMask(
    props?: Omit<ComponentProps<typeof ScrollMask>, "children">,
  ) {
    return renderMask({
      startChrome: <span>header</span>,
      endChrome: <span>footer</span>,
      ...props,
    });
  }

  // The slot wrapper ScrollMask owns, holding the consumer's chrome directly.
  function slotOf(text: string) {
    const slot = screen.getByText(text).parentElement;
    if (!slot) throw new Error("slot structure missing");
    return slot;
  }

  it("renders the slots inside the scroller with the content between them", () => {
    const root = renderChromeMask();
    const scroller = root.firstElementChild;
    const header = screen.getByText("header");
    const content = screen.getByText("content");
    const footer = screen.getByText("footer");

    expect(scroller).toContainElement(header);
    expect(scroller).toContainElement(footer);
    expect(
      header.compareDocumentPosition(content) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      content.compareDocumentPosition(footer) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("lays the scroller out as a flex line and grows the middle", () => {
    const root = renderChromeMask();

    expect(root.firstElementChild?.className).toContain(
      "styles.scrollerChromeColumn",
    );
    expect(screen.getByText("content").parentElement?.className).toContain(
      "styles.middle",
    );
  });

  it("keeps the slotless scroller free of the slot layout", () => {
    const root = renderMask();

    expect(root.firstElementChild?.className).not.toContain(
      "styles.scrollerChrome",
    );
  });

  it("pins each slot sticky against its own edge", () => {
    renderChromeMask();

    expect(slotOf("header").className).toContain("styles.chrome");
    expect(slotOf("header").className).toContain("styles.chromeBlockStart");
    expect(slotOf("footer").className).toContain("styles.chrome");
    expect(slotOf("footer").className).toContain("styles.chromeBlockEnd");
  });

  // A scroller with the region's corners is itself a rounded clip, so no band
  // may live inside it: every band stays a child of the root beside the
  // scroller, whichever edges carry chrome.
  it("keeps every band beside the scroller, never inside a slot", () => {
    const root = renderChromeMask();
    const bands = bandElements(root);

    expect(bands).toHaveLength(2);
    expect(root.children).toHaveLength(3);
    for (const band of bands) {
      expect(band.parentElement).toBe(root);
      expect(root.firstElementChild?.contains(band)).toBe(false);
    }
  });

  // jsdom lays nothing out and has no `ResizeObserver`, so the chrome measures
  // 0 and a slotted band is `calc(0px + depth)`: the measured size is the one
  // moving part, and the bare edge's band stays `depth` alone.
  it("sizes a slotted edge's band to the chrome plus depth, and a bare one to depth", () => {
    const root = renderMask({
      startChrome: <span>header</span>,
      depth: "40px",
    });
    const { start, end } = bandsOf(root);

    expect(start.parentElement).toBe(root);
    expect(end.parentElement).toBe(root);
    expect(start.getAttribute("style") ?? "").toContain("calc(0px + 40px)");
    expect(end.getAttribute("style") ?? "").not.toContain("calc(");
    expect(end.getAttribute("style") ?? "").toContain("40px");
  });

  it("ramps a slotted band across the chrome and depth past it", () => {
    const root = renderChromeMask({
      depth: "40px",
      showStartMask: true,
      showEndMask: true,
    });
    const { start, end } = bandsOf(root);

    expect(start.getAttribute("style") ?? "").toContain("calc(0px + 40px)");
    expect(end.getAttribute("style") ?? "").toContain("calc(0px + 40px)");
    for (const layer of layerStyles(start)) {
      expect(layer).toContain("to bottom");
    }
    for (const layer of layerStyles(end)) {
      expect(layer).toContain("to top");
    }
  });

  it("gives a slotted band the region's corners on its edge", () => {
    const { start, end } = bandsOf(renderChromeMask());

    expect(start.className).toContain("corners.blockStart");
    expect(end.className).toContain("corners.blockEnd");
  });

  it("drives a slotted band from the controlled props", () => {
    const root = renderChromeMask({
      showStartMask: true,
      showEndMask: false,
    });
    const { start, end } = bandsOf(root);

    for (const layer of start.children) {
      expect(layer.className).not.toContain("styles.hidden");
    }
    for (const layer of end.children) {
      expect(layer.className).toContain("styles.hidden");
    }
  });

  it("places horizontal slots against the inline edges", () => {
    const root = renderChromeMask({
      orientation: "horizontal",
      showStartMask: true,
      showEndMask: true,
    });

    expect(root.firstElementChild?.className).toContain(
      "styles.scrollerChromeRow",
    );
    expect(slotOf("header").className).toContain("styles.chromeInlineStart");
    expect(slotOf("footer").className).toContain("styles.chromeInlineEnd");
    const { start, end } = bandsOf(root);
    expect(start.className).toContain("corners.inlineStart");
    expect(end.className).toContain("corners.inlineEnd");
    for (const layer of layerStyles(start)) {
      expect(layer).toContain("to right");
    }
    for (const layer of layerStyles(end)) {
      expect(layer).toContain("to left");
    }
  });

  it("still forwards the ref to the scroller with slots present", () => {
    const ref = createRef<HTMLDivElement>();
    const root = renderChromeMask({ ref });

    expect(ref.current).toBe(root.firstElementChild);
  });
});

// jsdom has neither `ResizeObserver` nor layout, so every test above measures a
// slot at 0. These stand the measured path up: an observer that delivers once
// on `observe` (the browser's first delivery, minus the wait), and a slot box
// with a size on the axis being measured.
class ImmediateResizeObserver implements ResizeObserver {
  readonly #callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.#callback = callback;
  }

  observe() {
    this.#callback([], this);
  }

  unobserve() {
    // One delivery, nothing observed to stop observing.
  }

  disconnect() {
    // One delivery, nothing observed to disconnect.
  }
}

describe("ScrollMask measured chrome", () => {
  const restores: (() => void)[] = [];

  function stubResizeObserver() {
    const previous = globalThis.ResizeObserver;
    globalThis.ResizeObserver = ImmediateResizeObserver;
    restores.push(() => {
      globalThis.ResizeObserver = previous;
    });
  }

  function stubOffsetSize(axis: "offsetHeight" | "offsetWidth", size: number) {
    const previous = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      axis,
    );
    Object.defineProperty(HTMLElement.prototype, axis, {
      configurable: true,
      get: () => size,
    });
    restores.push(() => {
      if (previous)
        Object.defineProperty(HTMLElement.prototype, axis, previous);
    });
  }

  afterEach(() => {
    for (const restore of restores.splice(0).reverse()) restore();
  });

  it("grows a slotted band to the chrome's measured box plus the depth", () => {
    stubResizeObserver();
    stubOffsetSize("offsetHeight", 48);

    const { start, end } = bandsOf(
      renderMask({ startChrome: <span>header</span>, depth: "40px" }),
    );

    expect(start.getAttribute("style") ?? "").toContain("calc(48px + 40px)");
    // The bare edge is untouched by the measurement: still `depth` alone.
    expect(end.getAttribute("style") ?? "").not.toContain("calc(");
    expect(end.getAttribute("style") ?? "").toContain("40px");
  });

  it("measures a horizontal slot across the inline axis", () => {
    stubResizeObserver();
    stubOffsetSize("offsetWidth", 64);

    const { start } = bandsOf(
      renderMask({
        orientation: "horizontal",
        startChrome: <span>header</span>,
        depth: "40px",
      }),
    );

    expect(start.getAttribute("style") ?? "").toContain("calc(64px + 40px)");
  });
});
