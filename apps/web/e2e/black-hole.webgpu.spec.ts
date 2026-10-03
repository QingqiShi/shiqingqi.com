import { expect, test, type Page } from "@playwright/test";
import { readScreenshotRegion } from "./helpers/read-screenshot-region.ts";
import { scrollToAndSettle } from "./helpers/scroll.ts";

const PAGE = "/en/design-system/foundations/effect-layer";

// The layer mounts after hydration and an async device request.
const MOUNT_TIMEOUT = 15_000;
// A software GPU on a busy machine can draw less than one frame a second,
// and a beam takes several frames to turn.
const SETTLE_TIMEOUT = 30_000;
// How far a channel must be from the page background to count as lit.
const LIT = 40;
// The box of pixels that shows whether a beam passes, how far along the beam
// it is, and how far a pointer is from the beam when it aims.
const BOX = 81;
const RAY_DISTANCE = 220;
const POINTER_DISTANCE = 500;
const VIEWPORT = { width: 1280, height: 800 };

declare global {
  interface Window {
    /** How many command buffers and draws the page has sent to the GPU. */
    gpuWork?: { submits: number; draws: number };
  }
}

test.use({ viewport: VIEWPORT });
test.slow();

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const work = { submits: 0, draws: 0 };
    window.gpuWork = work;
    const gpu = navigator.gpu;
    const requestAdapter = gpu.requestAdapter.bind(gpu);
    gpu.requestAdapter = async (options) => {
      const adapter = await requestAdapter(options);
      if (adapter === null) {
        return null;
      }
      const requestDevice = adapter.requestDevice.bind(adapter);
      adapter.requestDevice = async (descriptor) => {
        const device = await requestDevice(descriptor);
        const { queue } = device;
        const submit = queue.submit.bind(queue);
        queue.submit = (buffers) => {
          work.submits += 1;
          submit(buffers);
        };
        const createCommandEncoder = device.createCommandEncoder.bind(device);
        device.createCommandEncoder = (encoderDescriptor) => {
          const encoder = createCommandEncoder(encoderDescriptor);
          const beginRenderPass = encoder.beginRenderPass.bind(encoder);
          encoder.beginRenderPass = (passDescriptor) => {
            const pass = beginRenderPass(passDescriptor);
            const draw = pass.draw.bind(pass);
            pass.draw = (...args) => {
              work.draws += 1;
              draw(...args);
            };
            return pass;
          };
          return encoder;
        };
        return device;
      };
      return adapter;
    };
  });
});

const scrollCanvases = (page: Page) =>
  page.locator('[data-effect-layer="scroll"]');

/**
 * The most lit pixel of a line of pixels, measured against the line's most
 * common colour, which is the page background.
 */
function brightest(line: readonly number[][]) {
  const background = [0, 1, 2].map(
    (channel) =>
      line.map((pixel) => pixel[channel]).sort((a, b) => a - b)[
        Math.floor(line.length / 2)
      ],
  );
  let index = 0;
  let value = 0;
  for (const [at, pixel] of line.entries()) {
    const lit = Math.max(
      ...pixel.map((channel, which) => Math.abs(channel - background[which])),
    );
    if (lit > value) {
      index = at;
      value = lit;
    }
  }
  return { index, value };
}

/** The centre of an element, in viewport coordinates. */
async function centreOf(page: Page, selector: string) {
  const box = await page.locator(selector).first().boundingBox();
  if (box === null) {
    throw new Error(`${selector} has no box`);
  }
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
}

/** Whether the light crosses a box of pixels. */
async function isLit(
  page: Page,
  clip: { x: number; y: number; width: number; height: number },
) {
  const rows = await readScreenshotRegion(page, clip);
  return brightest(rows.flat()).value > LIT;
}

/** The page y of an element's top edge. */
function pageTopOf(page: Page, selector: string) {
  return page
    .locator(selector)
    .first()
    .evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY,
    );
}

/**
 * Scrolls the first Light beam near the top of the viewport, and returns
 * where it can be aimed. A beam at rest points at the nearest Black hole,
 * and which that is depends on where the page above the test bench puts the
 * Black hole on the band edge. So `rest` is a box of pixels on the ray to the
 * nearest one, and `aside` is a box on a ray across it, with the `pointer`
 * that aims the beam along that ray.
 */
async function besideFirstBeam(page: Page) {
  const source = "[data-light-beam-test]";
  await scrollToAndSettle(
    page,
    Math.round(await pageTopOf(page, source)) - 200,
  );
  const { x, y } = await centreOf(page, source);
  const holes = await page
    .locator("[data-black-hole-test]")
    .evaluateAll((elements) =>
      elements.map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
      }),
    );
  const distanceTo = (hole: { x: number; y: number }) =>
    Math.hypot(hole.x - x, hole.y - y);
  const nearest = holes.reduce((best, hole) =>
    distanceTo(hole) < distanceTo(best) ? hole : best,
  );
  const length = distanceTo(nearest);
  const toward = { x: (nearest.x - x) / length, y: (nearest.y - y) / length };

  const pointerAcross = (sign: number) => ({
    x: x - sign * toward.y * POINTER_DISTANCE,
    y: y + sign * toward.x * POINTER_DISTANCE,
  });
  const pointer = [1, -1]
    .map(pointerAcross)
    .find(
      (point) =>
        point.x > 0 &&
        point.x < VIEWPORT.width &&
        point.y > 0 &&
        point.y < VIEWPORT.height,
    );
  if (pointer === undefined) {
    throw new Error("no pointer position across the beam is in the viewport");
  }
  const boxAlong = (target: { x: number; y: number }) => {
    const at = Math.hypot(target.x - x, target.y - y);
    return {
      x: Math.round(x + ((target.x - x) / at) * RAY_DISTANCE - BOX / 2),
      y: Math.round(y + ((target.y - y) / at) * RAY_DISTANCE - BOX / 2),
      width: BOX,
      height: BOX,
    };
  };
  return { rest: boxAlong(nearest), aside: boxAlong(pointer), pointer };
}

async function openTestBench(page: Page) {
  await page.goto(PAGE);
  await expect(scrollCanvases(page)).toHaveCount(2, {
    timeout: MOUNT_TIMEOUT,
  });
  await expect(
    page.locator('[data-black-hole-test="band-edge"]'),
  ).toBeVisible();
}

test("bends light into a ring that meets across a band edge", async ({
  page,
}) => {
  await openTestBench(page);
  const card = page.locator('[data-black-hole-test="band-edge"]');
  const edge = await card.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return Math.round(rect.top + window.scrollY + rect.height / 2);
  });
  await scrollToAndSettle(page, edge - 400);
  await expect
    .poll(() =>
      scrollCanvases(page).evaluateAll((canvases) =>
        canvases.map((canvas) =>
          canvas instanceof HTMLElement ? canvas.style.transform : "",
        ),
      ),
    )
    .toContain(`translateY(${String(edge)}px)`);

  // Both beams aim through the card's centre, so its ring lights up.
  const { x, box } = await centreOf(page, '[data-black-hole-test="band-edge"]');
  await page.mouse.move(x, 400);

  // The ring passes the card's left end about 30px out, on the band edge.
  // Each band draws one side of it, and the two sides must meet.
  const clip = { x: Math.round(box.x) - 70, y: 396, width: 64, height: 9 };
  const litNear = (line: readonly number[][], index: number) =>
    brightest(line.slice(Math.max(0, index - 2), index + 3)).value > LIT;
  await expect
    .poll(
      async () => {
        const rows = await readScreenshotRegion(page, clip);
        const [above, below] = [rows[1], rows[7]];
        const brightestAbove = brightest(above);
        const brightestBelow = brightest(below);
        return (
          brightestAbove.value > LIT &&
          brightestBelow.value > LIT &&
          litNear(below, brightestAbove.index) &&
          litNear(above, brightestBelow.index)
        );
      },
      { timeout: SETTLE_TIMEOUT },
    )
    .toBe(true);
});

test("rests on the nearest Black hole and turns towards the pointer", async ({
  page,
}) => {
  await openTestBench(page);
  const { rest, aside, pointer } = await besideFirstBeam(page);

  await expect
    .poll(() => isLit(page, rest), { timeout: SETTLE_TIMEOUT })
    .toBe(true);
  expect(await isLit(page, aside)).toBe(false);

  await page.mouse.move(pointer.x, pointer.y);
  await expect
    .poll(() => isLit(page, aside), { timeout: SETTLE_TIMEOUT })
    .toBe(true);
  expect(await isLit(page, rest)).toBe(false);
});

test("turns a beam only while pressed under reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openTestBench(page);
  const { aside, pointer } = await besideFirstBeam(page);

  await page.mouse.move(pointer.x, pointer.y);
  // Give a frame the chance to draw, then check that the beam held still.
  await page.waitForTimeout(500);
  expect(await isLit(page, aside)).toBe(false);

  await page.mouse.down();
  await page.mouse.move(pointer.x + 1, pointer.y);
  await expect
    .poll(() => isLit(page, aside), { timeout: SETTLE_TIMEOUT })
    .toBe(true);
  await page.mouse.up();
});

test("draws nothing while its light is off screen or the beams rest", async ({
  page,
}) => {
  await openTestBench(page);
  const work = () => page.evaluate(() => ({ ...window.gpuWork }));

  // At the top of the page every beam is out of reach.
  await scrollToAndSettle(page, 0);
  await page.waitForTimeout(500);
  const before = await work();
  await scrollToAndSettle(page, 300);
  await expect
    .poll(async () => (await work()).submits)
    .toBeGreaterThan(before.submits ?? 0);
  expect((await work()).draws).toBe(before.draws);

  // At the test bench, once the beams rest, no frame runs.
  const top = await pageTopOf(page, "[data-black-hole-stage]");
  await scrollToAndSettle(page, Math.round(top));
  await expect
    .poll(
      async () => {
        const start = (await work()).submits ?? 0;
        await page.waitForTimeout(1000);
        return ((await work()).submits ?? 0) - start;
      },
      { timeout: SETTLE_TIMEOUT },
    )
    .toBe(0);
});
