import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildBlurLayers } from "./build-blur-layers.ts";
import { ProgressiveBlur } from "./progressive-blur.tsx";

afterEach(() => {
  vi.restoreAllMocks();
});

// A 200×100 box with the floating element sitting at 50/40 to 150/80, so the
// four available distances are all different: 50 inline-start, 50 inline-end,
// 40 block-start, 20 block-end.
const geometry = {
  width: 200,
  height: 100,
  left: 50,
  top: 40,
  right: 150,
  bottom: 80,
};

function layersFor(overrides?: { radius?: number }) {
  return buildBlurLayers({
    geometry,
    radius: overrides?.radius ?? 16,
    isShown: true,
  });
}

// Every mask is an SVG image behind a data URI. Decoded, an assertion reads as
// the shape it draws rather than as a run of percent escapes.
function maskSvg(mask: string) {
  const payload = /^url\("data:image\/svg\+xml,(.+)"\)$/.exec(mask)?.[1];
  if (payload === undefined) throw new Error(`not an SVG mask: ${mask}`);
  return decodeURIComponent(payload);
}

describe("buildBlurLayers", () => {
  // Bands of 10 inline-start, 10 inline-end, 8 block-start, 4 block-end, so
  // the mean band is 10 across and 6 down — the rounding and the ramp.
  it("rounds the strongest layer half a band out from the element", () => {
    const [, , , , strongest] = layersFor();

    expect(maskSvg(strongest.mask)).toBe(
      "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'>" +
        "<filter id='ramp' filterUnits='userSpaceOnUse' x='0' y='0' width='200' height='100'>" +
        "<feGaussianBlur stdDeviation='3.03 1.82'/></filter>" +
        "<rect x='45' y='36' width='110' height='46' rx='5' ry='3' filter='url(#ramp)'/>" +
        "</svg>",
    );
  });

  it("runs the weakest layer out to the full reach on every side", () => {
    const [weakest] = layersFor();

    expect(maskSvg(weakest.mask)).toBe(
      "<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'>" +
        "<filter id='ramp' filterUnits='userSpaceOnUse' x='0' y='0' width='200' height='100'>" +
        "<feGaussianBlur stdDeviation='3.03 1.82'/></filter>" +
        "<rect x='5' y='4' width='190' height='94' rx='45' ry='27' filter='url(#ramp)'/>" +
        "</svg>",
    );
  });

  it("doubles each layer's radius up to the full radius at the element", () => {
    const layers = layersFor();

    expect(layers.map((one) => one.filter)).toStrictEqual([
      "blur(1px)",
      "blur(2px)",
      "blur(4px)",
      "blur(8px)",
      "blur(16px)",
    ]);
  });

  it("clamps the radius to the cap", () => {
    const layers = layersFor({ radius: 64 });

    expect(layers[4]?.filter).toBe("blur(32px)");
  });

  it("keeps every layer on its place on the ramp while melted", () => {
    const melted = buildBlurLayers({ geometry, radius: 16, isShown: false });

    expect(melted.map((one) => one.mask)).toStrictEqual(
      layersFor().map((one) => one.mask),
    );
  });

  it("blurs the whole box uniformly while nothing is measured", () => {
    const layers = buildBlurLayers({
      geometry: null,
      radius: 16,
      isShown: true,
    });

    expect(layers.map((one) => one.mask)).toStrictEqual([
      "none",
      "none",
      "none",
      "none",
      "none",
    ]);
  });
});

function renderBlur(
  props?: Omit<ComponentProps<typeof ProgressiveBlur>, "children">,
) {
  return renderSwappableBlur(props).root;
}

// A blur that can lose its floating element and get it back — a page shell
// that keeps the blur mounted across a navigation does exactly that.
function renderSwappableBlur(
  props?: Omit<ComponentProps<typeof ProgressiveBlur>, "children">,
) {
  const element = <button type="button">Save changes</button>;
  const { container, rerender } = render(
    <ProgressiveBlur {...props}>{element}</ProgressiveBlur>,
  );
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("ProgressiveBlur rendered nothing");
  }
  return {
    root,
    setElement: (isPresent: boolean) => {
      rerender(
        <ProgressiveBlur {...props}>
          {isPresent ? element : null}
        </ProgressiveBlur>,
      );
    },
  };
}

// The blur radius and mask land in inline CSS custom properties (StyleX
// dynamic styles), which jsdom preserves, so the geometry is asserted through
// each layer's `style` attribute.
function layerElements(root: HTMLElement) {
  return [...root.querySelectorAll('[aria-hidden="true"]')];
}

describe("ProgressiveBlur", () => {
  // The root has to keep the class the css-prop transform generates for it.
  // Without `position: absolute` the box collapses to no height, every
  // measurement comes back empty, and the ramp degrades to one uniform blur
  // across the whole box — which looks like a much heavier blur, not a
  // missing one. jsdom lays nothing out, so the class is the only handle.
  it("keeps its own placement styles on the root", () => {
    const root = renderBlur();

    expect(root.className).toContain("styles.root");
  });

  it("renders the floating element it is given", () => {
    renderBlur();

    expect(
      screen.getByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
  });

  it("hides the layers from assistive technology, not the element", () => {
    const root = renderBlur();

    expect(root).not.toHaveAttribute("aria-hidden");
    expect(layerElements(root)).toHaveLength(5);
  });

  it("blurs the whole box at full radius before the first measurement", () => {
    const root = renderBlur({ radius: 16 });
    const layers = layerElements(root).map(
      (layer) => layer.getAttribute("style") ?? "",
    );

    expect(layers[0]).toContain("blur(1px)");
    expect(layers[4]).toContain("blur(16px)");
    for (const layer of layers) {
      expect(layer).toContain("maskImage: none");
    }
  });

  // A share each rather than one tinted plate on the strongest layer: the
  // shares compound against the element and drop one per band on the way out,
  // so the Wash eases out with the blur instead of ending at an edge.
  it("gives every layer a share of the Wash towards the page colour", () => {
    const root = renderBlur();

    for (const layer of layerElements(root)) {
      expect(layer.className).toContain("styles.wash");
    }
  });

  it("melts the blur away instead of unmounting when not shown", () => {
    const root = renderBlur({ isShown: false });
    const layers = layerElements(root);

    // The hidden state lives on the layers, never on the root: a hidden root
    // would leave the floating element uncaptured by a view transition, and
    // the element's enter animation with it.
    expect(root.className).not.toContain("styles.hidden");
    expect(layers).toHaveLength(5);
    for (const layer of layers) {
      expect(layer.className).toContain("styles.hidden");
      expect(layer.getAttribute("style") ?? "").toContain("blur(0px)");
      expect(layer.className).not.toContain("styles.wash");
    }
  });

  it("stays fully shown by default", () => {
    const root = renderBlur();

    for (const layer of layerElements(root)) {
      expect(layer.className).not.toContain("styles.hidden");
    }
  });

  // The element is measured at the box's own geometry, so the melt-out keeps
  // the last measurement rather than snapping every mask to uniform.
  it("melts the blur out when the floating element leaves the slot", async () => {
    layOut(rect(50, 40, 150, 80), rect(0, 0, 200, 100));
    const { root, setElement } = renderSwappableBlur({ radius: 16 });

    setElement(false);

    // The child list is watched through a MutationObserver, which reports
    // after the commit.
    await waitFor(() => {
      expect(layerElements(root)[0]?.className).toContain("styles.hidden");
    });
    const melted = buildBlurLayers({ geometry, radius: 16, isShown: false });
    for (const [index, { filter, mask }] of melted.entries()) {
      expect(layerStyles(root)[index]).toContain(filter);
      expect(layerStyles(root)[index]).toContain(mask);
    }
  });

  // The box is the root's parent, which never clips: the root, the wrapper
  // and every layer take its corners by inheritance, so each layer clips its
  // own backdrop to them. jsdom lays nothing out, so the class is the handle.
  it("takes the box's corners on the root, the wrapper and every layer", () => {
    const root = renderBlur();

    expect(root.className).toContain("styles.corners");
    expect(root.firstElementChild?.className).toContain("styles.corners");
    for (const layer of layerElements(root)) {
      expect(layer.className).toContain("styles.corners");
    }
  });
});

function rect(left: number, top: number, right: number, bottom: number) {
  return {
    left,
    top,
    right,
    bottom,
    width: right - left,
    height: bottom - top,
    x: left,
    y: top,
    toJSON: vi.fn(),
  };
}

// jsdom lays nothing out: every rect is empty, so nothing is measured unless
// a test hands out rects itself. The floating element is the only `<button>`
// rendered; everything else measured is a box of the blur's own, which stands
// at its containing block's origin plus whatever offsets were placed on it.
function layOut(element: MockRect, origin = rect(0, 0, 0, 0)) {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      if (this.tagName === "BUTTON") return element;
      const style = this instanceof HTMLElement ? this.style : undefined;
      return shift(
        origin,
        Number.parseFloat(style?.left ?? "") || 0,
        Number.parseFloat(style?.top ?? "") || 0,
      );
    },
  );
}

type MockRect = ReturnType<typeof rect>;

function shift(source: MockRect, left: number, top: number) {
  return rect(
    source.left + left,
    source.top + top,
    source.right + left,
    source.bottom + top,
  );
}

function boxOf(root: HTMLElement) {
  const box = root.firstElementChild;
  if (!(box instanceof HTMLElement)) {
    throw new Error("ProgressiveBlur rendered no layers wrapper");
  }
  return box;
}

function boxStyle(box: HTMLElement) {
  return [box.style.top, box.style.left];
}

// The box's size is two custom properties on the wrapper (a StyleX dynamic
// style), which jsdom preserves in the `style` attribute.
function boxSize(box: HTMLElement) {
  return box.getAttribute("style") ?? "";
}

function layerStyles(root: HTMLElement) {
  return layerElements(root).map((layer) => layer.getAttribute("style") ?? "");
}

describe("ProgressiveBlur with reach", () => {
  // The mask is drawn at the box's size, so it waits on the placement — and
  // the box is hidden until then anyway.
  it("blurs the whole box uniformly until the box is placed", () => {
    const root = renderBlur({ reach: 40, radius: 16 });

    for (const layer of layerElements(root)) {
      expect(layer.getAttribute("style") ?? "").toContain("maskImage: none");
    }
  });

  it("masks every layer at the placed box's size", () => {
    // The element is 100×50, so the box is that plus 40 on every side, and the
    // element's rect within it is that same 40 in from each edge.
    layOut(rect(100, 50, 200, 100));
    const root = renderBlur({ reach: 40, radius: 16 });

    const expected = buildBlurLayers({
      geometry: {
        width: 180,
        height: 130,
        left: 40,
        top: 40,
        right: 140,
        bottom: 90,
      },
      radius: 16,
      isShown: true,
    });
    const rendered = layerStyles(root);
    expect(rendered).toHaveLength(expected.length);
    for (const [index, { filter, mask }] of expected.entries()) {
      expect(rendered[index]).toContain(filter);
      expect(rendered[index]).toContain(mask);
    }
  });

  // The root has to keep the reach class, which takes it out of its ancestor's
  // fill and into flow, and the wrapper its own, which makes it the fixed box
  // the layers fill. An absolute box would widen the page for a hidden
  // floating element near a viewport edge, and would sit under whatever
  // squircle overflow clip the page around the element carries, which strips
  // the layers' masks in Chromium. The fixed box is square, so nothing here
  // inherits a corner.
  it("wraps the element in flow and fills a fixed box with the layers", () => {
    const root = renderBlur({ reach: 40 });

    expect(root.className).toContain("styles.reachRoot");
    expect(root.className).not.toContain("styles.corners");
    expect(boxOf(root).className).toContain("styles.reachLayers");
    expect(boxOf(root).className).not.toContain("styles.corners");
    for (const layer of layerElements(root)) {
      expect(layer.getAttribute("style")).not.toContain("inset");
      expect(layer.className).not.toContain("styles.corners");
    }
  });

  it("hides the box until the element has been measured", () => {
    const root = renderBlur({ reach: 40 });

    expect(boxOf(root).className).toContain("styles.unplaced");
    expect(boxStyle(boxOf(root))).toStrictEqual(["", ""]);
  });

  it("places the box `reach` around the element, against the box's containing block", () => {
    // The element sits at 100/50 to 200/100 in the viewport, and a transformed
    // ancestor puts the box's origin at 20/10.
    layOut(rect(100, 50, 200, 100), rect(20, 10, 20, 10));
    const root = renderBlur({ reach: 40 });

    expect(boxOf(root).className).not.toContain("styles.unplaced");
    expect(boxStyle(boxOf(root))).toStrictEqual(["0px", "40px"]);
  });

  // Scroll and resize both place the box on the next animation frame, so the
  // assertions wait for it.
  it("follows the element on scroll and on resize while shown", async () => {
    layOut(rect(100, 50, 200, 100));
    const root = renderBlur({ reach: 40 });
    const element = screen.getByRole("button", { name: "Save changes" });

    layOut(rect(100, 20, 200, 70));
    // A scroller inside the page: its scroll event does not bubble.
    fireEvent.scroll(element);
    await waitFor(() => {
      expect(boxStyle(boxOf(root))).toStrictEqual(["-20px", "60px"]);
    });

    layOut(rect(100, 20, 260, 70));
    fireEvent(window, new Event("resize"));
    await waitFor(() => {
      expect(boxSize(boxOf(root))).toContain("240px");
    });
    expect(boxStyle(boxOf(root))).toStrictEqual(["-20px", "60px"]);
  });

  // The wrapper states the box's size and takes none of it, and the layers
  // read it and overflow the wrapper — see "Progressive blur" in `CONTEXT.md`
  // for what a sized fixed box costs on iOS.
  it("states the box's size on the wrapper without taking it", () => {
    layOut(rect(100, 50, 200, 100));
    const root = renderBlur({ reach: 40 });

    expect(boxOf(root).className).toContain("styles.reachLayers");
    expect(boxOf(root).style.width).toBe("");
    expect(boxOf(root).style.height).toBe("");
    expect(boxSize(boxOf(root))).toContain("180px");
    expect(boxSize(boxOf(root))).toContain("130px");
    for (const layer of layerElements(root)) {
      expect(layer.className).toContain("styles.reachLayer");
    }
  });

  it("keeps the box where it was while not shown, so the melt plays in place", () => {
    layOut(rect(100, 50, 200, 100));
    const root = renderBlur({ reach: 40, isShown: false });
    const placed = boxStyle(boxOf(root));

    layOut(rect(100, 20, 200, 70));
    fireEvent.scroll(screen.getByRole("button", { name: "Save changes" }));
    fireEvent(window, new Event("resize"));

    expect(boxStyle(boxOf(root))).toStrictEqual(placed);
  });

  it("melts away in place when not shown", () => {
    const root = renderBlur({ reach: 40, isShown: false });

    for (const layer of layerElements(root)) {
      expect(layer.className).toContain("styles.hidden");
      expect(layer.getAttribute("style") ?? "").toContain("blur(0px)");
    }
  });

  // A shell that keeps the blur mounted across a navigation loses the control
  // it blurs around, and `isShown` stays true — so the blur has to melt out on
  // the element rather than on the prop alone.
  it("melts the blur out when the floating element leaves the slot", async () => {
    layOut(rect(100, 50, 200, 100));
    const { root, setElement } = renderSwappableBlur({ reach: 40, radius: 16 });
    for (const layer of layerElements(root)) {
      expect(layer.className).not.toContain("styles.hidden");
    }

    setElement(false);

    await waitFor(() => {
      expect(layerElements(root)[0]?.className).toContain("styles.hidden");
    });
    for (const layer of layerElements(root)) {
      expect(layer.className).toContain("styles.hidden");
      expect(layer.className).not.toContain("styles.wash");
      expect(layer.getAttribute("style") ?? "").toContain("blur(0px)");
    }
    // The box keeps its last place and size, so the melt plays where the
    // element was.
    expect(boxStyle(boxOf(root))).toStrictEqual(["10px", "60px"]);
    expect(boxSize(boxOf(root))).toContain("180px");
    expect(boxSize(boxOf(root))).toContain("130px");
  });

  it("places and shows the blur again when a floating element comes back", async () => {
    layOut(rect(100, 50, 200, 100));
    const { root, setElement } = renderSwappableBlur({ reach: 40, radius: 16 });
    setElement(false);
    await waitFor(() => {
      expect(layerElements(root)[0]?.className).toContain("styles.hidden");
    });

    layOut(rect(100, 20, 260, 70));
    setElement(true);

    await waitFor(() => {
      expect(layerElements(root)[0]?.className).not.toContain("styles.hidden");
    });
    for (const layer of layerElements(root)) {
      expect(layer.className).toContain("styles.wash");
    }
    expect(boxStyle(boxOf(root))).toStrictEqual(["-20px", "60px"]);
    expect(boxSize(boxOf(root))).toContain("240px");
  });
});
