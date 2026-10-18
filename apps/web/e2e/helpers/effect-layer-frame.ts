import type { Page } from "@playwright/test";

/** The detail of an `effectlayerframe` event, which the debug view sends. */
export interface EffectLayerFrame {
  scrollX: number;
  scrollY: number;
  elements: {
    id: number;
    element: Element;
    x: number;
    y: number;
    width: number;
    height: number;
    roles: number;
    measurement: number;
    canvas: "scroll" | "fixed" | "fixedBottom";
    radii: readonly number[];
    fill: readonly number[];
  }[];
  pointer: {
    x: number;
    y: number;
    pressed: boolean;
    present: boolean;
  };
}

declare global {
  interface Window {
    /** The detail of the last `effectlayerframe` event. */
    lastEffectLayerFrame?: EffectLayerFrame;
  }
  interface WindowEventMap {
    effectlayerframe: CustomEvent<EffectLayerFrame>;
  }
}

/**
 * Keeps the detail of the last `effectlayerframe` event in
 * `window.lastEffectLayerFrame`, from the next navigation on.
 */
export async function recordEffectLayerFrames(page: Page) {
  await page.addInitScript(() => {
    window.addEventListener("effectlayerframe", (event) => {
      window.lastEffectLayerFrame = event.detail;
    });
  });
}
