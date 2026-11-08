import { PondInstance, pondLayout } from "../_generated/wgsl/layouts.ts";
import { pondWgsl } from "../_generated/wgsl/pond.ts";
import { createBinding } from "./create-binding.ts";
import { createInstancedDraw } from "./create-instanced-draw.ts";
import { createPackedBuffer } from "./create-packed-buffer.ts";
import { roleBits } from "./effect-roles.ts";
import { pondRuns, type PondView } from "./pond-runs.ts";
import { isLightBackdrop, shownOver } from "./ripple-color.ts";
import type { Effect } from "./types.ts";

const POND_BIT = roleBits(["pond"]);

/**
 * How much the glint and the shade show. A glint hardly shows on a light
 * fill, and a shade on a dark one, so each leans on the light it can show.
 */
const LIGHTING = {
  light: { glint: 0.5, shade: 0.08 },
  dark: { glint: 0.26, shade: 0.12 },
} as const;

interface Shown {
  readonly elementIndex: number;
  readonly view: PondView;
  readonly lighting: (typeof LIGHTING)[keyof typeof LIGHTING];
}

const sameShown = (next: readonly Shown[], previous: readonly Shown[]) =>
  next.length === previous.length &&
  next.every(
    ({ elementIndex, view, lighting }, index) =>
      elementIndex === previous[index].elementIndex &&
      view === previous[index].view &&
      lighting === previous[index].lighting,
  );

/**
 * The effect behind `usePond`: the light on the water of each element whose
 * rings run, in the frame of rings that bends its content.
 *
 * @internal
 */
export const pondEffect: Effect = {
  async setup(setup) {
    const { device, colorTarget, requestFrame } = setup;
    const pond = await createInstancedDraw(device, pondWgsl, colorTarget);
    const buffer = createPackedBuffer(device, PondInstance);
    const binding = createBinding(device, pondLayout, () => ({
      ponds: buffer.buffer,
    }));
    const stopListening = pondRuns.onStart(requestFrame);
    let shown: Shown[] = [];
    let next: Shown[] = [];
    return {
      update(_encoder, frame) {
        next.length = 0;
        let running = false;
        if (!frame.reducedMotion) {
          for (const [index, record] of frame.elements.entries()) {
            if ((record.roles & POND_BIT) === 0) continue;
            const show = pondRuns.get(record.element);
            if (show === undefined) continue;
            running = true;
            const view = show();
            if (view === null) continue;
            const backdrop = frame.scopes[record.scopeIndex].backdrop;
            next.push({
              elementIndex: index,
              view,
              lighting: isLightBackdrop(shownOver(record.fill, backdrop))
                ? LIGHTING.light
                : LIGHTING.dark,
            });
          }
        }
        if (!sameShown(next, shown)) {
          buffer.write(
            next.map(({ elementIndex, view, lighting }) => ({
              element: elementIndex,
              stoneCount: view.stones.length,
              glint: lighting.glint,
              shade: lighting.shade,
              size: [view.width, view.height],
              stones: view.stones.map(({ x, y, profile }) => ({
                origin: [x, y],
                count: profile.length,
                profile,
              })),
            })),
          );
        }
        [shown, next] = [next, shown];
        return running;
      },
      draw(pass, target) {
        pond.draw(pass, target, shown, binding);
      },
      destroy() {
        stopListening();
        buffer.destroy();
      },
    };
  },
};
