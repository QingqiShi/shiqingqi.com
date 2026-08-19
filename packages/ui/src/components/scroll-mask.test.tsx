import { render, screen } from "@testing-library/react";
import { createRef, type ComponentProps } from "react";
import { describe, expect, it } from "vitest";
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

  it("renders one band per edge, hidden from assistive technology", () => {
    const bands = bandElements(renderMask());

    expect(bands).toHaveLength(2);
    for (const band of bands) {
      expect(band.className).toContain("styles.band");
      expect(band.children).toHaveLength(5);
    }
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

  // The slot wrapper ScrollMask owns: [band, content wrapper], with the
  // consumer's chrome inside the content wrapper.
  function slotOf(text: string) {
    const contentWrapper = screen.getByText(text).parentElement;
    const slot = contentWrapper?.parentElement;
    if (!contentWrapper || !slot) throw new Error("slot structure missing");
    return { slot, contentWrapper };
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

  it("pins each slot sticky against its own edge, chrome above the band", () => {
    renderChromeMask();
    const start = slotOf("header");
    const end = slotOf("footer");

    expect(start.slot.className).toContain("styles.chromeBlockStart");
    expect(end.slot.className).toContain("styles.chromeBlockEnd");
    expect(start.contentWrapper.className).toContain("styles.chromeContent");
    expect(end.contentWrapper.className).toContain("styles.chromeContent");
  });

  it("moves a slotted edge's band inside its chrome", () => {
    const root = renderChromeMask();
    const bands = bandElements(root);

    expect(bands).toHaveLength(2);
    // Both edges slotted: every band lives in a slot, none beside the scroller.
    expect(root.children).toHaveLength(1);
    expect(bands[0].parentElement?.className).toContain(
      "styles.chromeBlockStart",
    );
    expect(bands[1].parentElement?.className).toContain(
      "styles.chromeBlockEnd",
    );
  });

  it("keeps the bare edge's band beside the scroller with one slot", () => {
    const root = renderMask({ startChrome: <span>header</span> });
    const bands = bandElements(root);

    expect(bands).toHaveLength(2);
    expect(bands[0].parentElement?.className).toContain(
      "styles.chromeBlockStart",
    );
    expect(bands[1].parentElement).toBe(root);
  });

  it("ramps a slotted band across the chrome and depth past it", () => {
    const root = renderChromeMask({
      depth: "40px",
      showStartMask: true,
      showEndMask: true,
    });
    const { start, end } = bandsOf(root);

    expect(start.getAttribute("style") ?? "").toContain("calc(-1 * 40px)");
    expect(end.getAttribute("style") ?? "").toContain("calc(-1 * 40px)");
    for (const layer of layerStyles(start)) {
      expect(layer).toContain("to bottom");
    }
    for (const layer of layerStyles(end)) {
      expect(layer).toContain("to top");
    }
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
    expect(slotOf("header").slot.className).toContain(
      "styles.chromeInlineStart",
    );
    expect(slotOf("footer").slot.className).toContain("styles.chromeInlineEnd");
    const { start, end } = bandsOf(root);
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
