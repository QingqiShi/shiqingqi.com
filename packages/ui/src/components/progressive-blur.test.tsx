import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { buildBlurLayers } from "./progressive-blur-masks.ts";
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
});
