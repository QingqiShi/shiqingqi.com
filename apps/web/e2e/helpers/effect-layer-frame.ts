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
    /** A new object each time the tracker measures the element. */
    readings: object;
    carrier: "page" | "fixed" | "fixedBottom" | number;
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
    /** Each `readings` that `effectRecordOf` has seen, in the order it saw them. */
    effectLayerReadings?: object[];
  }
  interface WindowEventMap {
    effectlayerframe: CustomEvent<EffectLayerFrame>;
  }
}

/**
 * The record in the last frame of the element with an effect that is the
 * element labelled `label`, is in it or is around it: its carrier, a
 * number that changes each time the tracker measures the element again,
 * and how far the record is from where the browser
 * lays the element out now. `null` while no frame has it. It waits for a
 * frame first: headless Chromium renders, and so fires a scroll event, only
 * when a frame is asked for.
 */
export function effectRecordOf(page: Page, label: string) {
  return page.evaluate(async (label) => {
    await new Promise(requestAnimationFrame);
    const frame = window.lastEffectLayerFrame;
    const labelled = document.querySelector(`[aria-label="${label}"]`);
    const record = frame?.elements.find(
      ({ element, roles }) =>
        roles !== 0 &&
        labelled !== null &&
        (labelled.contains(element) || element.contains(labelled)),
    );
    if (frame === undefined || record === undefined) {
      return null;
    }
    const top = record.element.getBoundingClientRect().top;
    const seen = (window.effectLayerReadings ??= []);
    if (!seen.includes(record.readings)) {
      seen.push(record.readings);
    }
    return {
      carrier: record.carrier,
      measurement: seen.indexOf(record.readings),
      offset: Math.round(record.y - frame.scrollY - top),
    };
  }, label);
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
