import { describe, expect, it } from "vitest";
import { createBandDriver, type BandMetrics } from "./create-band-driver.ts";

// An iPhone: 430 px wide, 815 px large viewport, 775 px small, DPR 3. The
// band spans 1.625 large viewports: 1324 CSS px.
const phone: BandMetrics = {
  viewportWidth: 430,
  probed: { large: 815, small: 775 },
  docHeight: 5000,
  scale: 3,
};

function placedDriver(metrics = phone, scrollY = 0) {
  const driver = createBandDriver();
  driver.measure(metrics);
  const first = driver.frame(scrollY);
  if (first === null) throw new Error("no frame after a measurement");
  return { driver, first };
}

/** Scrolls from `from` to `to` in 16 ms steps of `step` px. */
function scrollTo(
  driver: ReturnType<typeof createBandDriver>,
  from: number,
  to: number,
  step: number,
  start = 1000,
) {
  let now = start;
  let needsMove = false;
  const direction = Math.sign(to - from);
  for (let y = from; direction * (to - y) >= 0; y += direction * step) {
    needsMove = driver.scroll(y, 775, now);
    now += 16;
  }
  return needsMove;
}

describe("createBandDriver", () => {
  it("gives no frame before a measurement", () => {
    expect(createBandDriver().frame(0)).toBeNull();
  });

  it("sizes the first frame in CSS px and device px", () => {
    const { first } = placedDriver();
    expect(first).toEqual({
      box: {
        width: 430,
        height: 1324,
        top: 0,
        pixelWidth: 1290,
        pixelHeight: 3972,
      },
      resized: true,
      moved: false,
    });
  });

  it("keeps the box while nothing changes", () => {
    const { driver } = placedDriver();
    expect(driver.frame(0)).toMatchObject({ resized: false, moved: false });
  });

  it("ignores the URL bar and reallocates for a new width", () => {
    const { driver } = placedDriver();
    expect(driver.classifyViewport({ width: 430, innerHeight: 815 })).toBe(
      "url-bar",
    );
    expect(driver.classifyViewport({ width: 932, innerHeight: 430 })).toBe(
      "width",
    );
    driver.measure({ ...phone, viewportWidth: 932 });
    expect(driver.frame(0)).toMatchObject({
      box: { width: 932, pixelWidth: 2796 },
      resized: true,
    });
  });

  it("reallocates when only the device pixel ratio changes", () => {
    const { driver } = placedDriver();
    driver.measure({ ...phone, scale: 2 });
    // A lower scale leaves room in the pixel budget for a span of 2.
    expect(driver.frame(0)).toMatchObject({
      box: { width: 430, height: 1630, pixelWidth: 860, pixelHeight: 3260 },
      resized: true,
    });
  });

  it("stays still while the visible area is well inside the band", () => {
    const { driver } = placedDriver();
    expect(scrollTo(driver, 0, 200, 10)).toBe(false);
    expect(driver.frame(200)).toMatchObject({ moved: false });
  });

  it("moves ahead of a scroll that comes near the leading edge", () => {
    const { driver } = placedDriver();
    expect(scrollTo(driver, 0, 400, 10)).toBe(true);
    const frame = driver.frame(400);
    expect(frame?.moved).toBe(true);
    // Most of the 509 px of spare height goes below the visible area.
    expect(400 - (frame?.box.top ?? 0)).toBeLessThan(509 / 2);
    expect(driver.stats().moves).toBe(1);
  });

  it("goes back to the centre when the scroll stops near the trailing edge", () => {
    const { driver } = placedDriver();
    scrollTo(driver, 0, 400, 10);
    driver.frame(400);
    expect(driver.rest(400)).toBe(true);
    // Half of the spare height on each side, snapped to device px.
    expect(driver.frame(400)).toMatchObject({ box: { top: 146 }, moved: true });
  });

  it("fits the band to a document shorter than the span", () => {
    const { first } = placedDriver({ ...phone, docHeight: 600 });
    expect(first.box).toMatchObject({ top: 0, height: 600, pixelHeight: 1800 });
  });

  it("keeps the band inside a document that became shorter", () => {
    const { driver } = placedDriver(phone, 4200);
    expect(driver.frame(4200)?.box.top).toBe(5000 - 1324);
    driver.measure({ ...phone, docHeight: 3000 });
    const frame = driver.frame(2185);
    expect(frame?.box.top).toBe(3000 - 1324);
    expect(frame?.moved).toBe(true);
  });

  it("counts a strip of the document the band did not cover", () => {
    const { driver } = placedDriver();
    driver.scroll(0, 775, 1000);
    driver.scroll(1200, 775, 1016);
    driver.scroll(0, 775, 1032);
    expect(driver.stats().inside).toMatchObject({
      events: 1,
      worstPx: 1200 + 775 - 1324,
      open: false,
    });
    expect(driver.stats().outside.events).toBe(0);
  });

  it("sizes and places the band again after a reset", () => {
    const { driver } = placedDriver();
    driver.reset();
    expect(driver.frame(0)).toMatchObject({ resized: true, moved: false });
  });
});
