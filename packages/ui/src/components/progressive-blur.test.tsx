import { fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildBlurLayers,
  buildReachBlurLayers,
} from "./progressive-blur-masks.ts";
import { ProgressiveBlur } from "./progressive-blur.tsx";

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

describe("buildBlurLayers", () => {
  it("holds the strongest layer opaque over the element and gone one band out", () => {
    const [, , , , strongest] = layersFor();

    expect(strongest.mask).toBe(
      "linear-gradient(to right, transparent 40px, #000 50px, #000 150px, transparent 160px), " +
        "linear-gradient(to bottom, transparent 32px, #000 40px, #000 80px, transparent 84px)",
    );
  });

  it("runs the weakest layer out to the full reach on every side", () => {
    const [weakest] = layersFor();

    expect(weakest.mask).toBe(
      "linear-gradient(to right, transparent 0px, #000 10px, #000 190px, transparent 200px), " +
        "linear-gradient(to bottom, transparent 0px, #000 8px, #000 96px, transparent 100px)",
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

describe("buildReachBlurLayers", () => {
  // A 40px reach: the element's edge is 40px in from every edge of the box,
  // and each band is 8px.
  function reachLayers(overrides?: { radius?: number; isShown?: boolean }) {
    return buildReachBlurLayers({
      reach: 40,
      radius: overrides?.radius ?? 16,
      isShown: overrides?.isShown ?? true,
    });
  }

  it("holds the strongest layer opaque over the element and gone one band out", () => {
    const [, , , , strongest] = reachLayers();

    expect(strongest.mask).toBe(
      "linear-gradient(to right, transparent 32px, #000 40px, #000 calc(100% - 40px), transparent calc(100% - 32px)), " +
        "linear-gradient(to bottom, transparent 32px, #000 40px, #000 calc(100% - 40px), transparent calc(100% - 32px))",
    );
  });

  it("runs the weakest layer out to the box's edge on every side", () => {
    const [weakest] = reachLayers();

    expect(weakest.mask).toBe(
      "linear-gradient(to right, transparent 0px, #000 8px, #000 calc(100% - 8px), transparent calc(100% - 0px)), " +
        "linear-gradient(to bottom, transparent 0px, #000 8px, #000 calc(100% - 8px), transparent calc(100% - 0px))",
    );
  });

  it("keeps every layer on its place on the ramp while melted", () => {
    const melted = reachLayers({ isShown: false });

    expect(melted.map((one) => one.mask)).toStrictEqual(
      reachLayers().map((one) => one.mask),
    );
  });
});

function renderBlur(
  props?: Omit<ComponentProps<typeof ProgressiveBlur>, "children">,
) {
  const { container } = render(
    <ProgressiveBlur {...props}>
      <button type="button">Save changes</button>
    </ProgressiveBlur>,
  );
  const root = container.firstElementChild;
  if (!(root instanceof HTMLElement)) {
    throw new Error("ProgressiveBlur rendered nothing");
  }
  return root;
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

  it("washes only the strongest layer towards the page colour", () => {
    const root = renderBlur();
    const classes = layerElements(root).map((layer) => layer.className);

    expect(classes[4]).toContain("styles.wash");
    for (const layerClass of classes.slice(0, 4)) {
      expect(layerClass).not.toContain("styles.wash");
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

function boxOf(root: HTMLElement) {
  const box = root.firstElementChild;
  if (!(box instanceof HTMLElement)) {
    throw new Error("ProgressiveBlur rendered no layers wrapper");
  }
  return box;
}

function boxStyle(box: HTMLElement) {
  return [box.style.top, box.style.left, box.style.width, box.style.height];
}

describe("ProgressiveBlur with reach", () => {
  // jsdom lays nothing out: every rect is empty, so the box is never placed
  // unless a test hands out rects itself. The floating element is the only
  // `<button>` rendered; everything else that is measured is the wrapper,
  // read at its containing block's origin.
  function layOut(element: ReturnType<typeof rect>, origin = rect(0, 0, 0, 0)) {
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
      function (this: Element) {
        return this.tagName === "BUTTON" ? element : origin;
      },
    );
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // The ramp is static, so it shows up here even though nothing was laid out.
  it("masks every layer along the static ramp", () => {
    const root = renderBlur({ reach: 40, radius: 16 });
    const rendered = layerElements(root).map(
      (layer) => layer.getAttribute("style") ?? "",
    );

    const expected = buildReachBlurLayers({
      reach: 40,
      radius: 16,
      isShown: true,
    });
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
    expect(boxStyle(boxOf(root))).toStrictEqual(["", "", "", ""]);
  });

  it("places the box `reach` around the element, against the box's containing block", () => {
    // The element sits at 100/50 to 200/100 in the viewport, and a transformed
    // ancestor puts the box's origin at 20/10.
    layOut(rect(100, 50, 200, 100), rect(20, 10, 20, 10));
    const root = renderBlur({ reach: 40 });

    expect(boxOf(root).className).not.toContain("styles.unplaced");
    expect(boxStyle(boxOf(root))).toStrictEqual([
      "0px",
      "40px",
      "180px",
      "130px",
    ]);
  });

  it("follows the element on scroll and on resize while shown", () => {
    layOut(rect(100, 50, 200, 100));
    const root = renderBlur({ reach: 40 });
    const element = screen.getByRole("button", { name: "Save changes" });

    layOut(rect(100, 20, 200, 70));
    // A scroller inside the page: its scroll event does not bubble.
    fireEvent.scroll(element);
    expect(boxStyle(boxOf(root))).toStrictEqual([
      "-20px",
      "60px",
      "180px",
      "130px",
    ]);

    layOut(rect(100, 20, 260, 70));
    fireEvent(window, new Event("resize"));
    expect(boxStyle(boxOf(root))).toStrictEqual([
      "-20px",
      "60px",
      "240px",
      "130px",
    ]);
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
});
