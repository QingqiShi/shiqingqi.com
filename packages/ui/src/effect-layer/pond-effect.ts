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
  readonly content: boolean;
  readonly lighting: (typeof LIGHTING)[keyof typeof LIGHTING];
}

const sameShown = (next: readonly Shown[], previous: readonly Shown[]) =>
  next.length === previous.length &&
  next.every(
    ({ elementIndex, view, content, lighting }, index) =>
      elementIndex === previous[index].elementIndex &&
      view === previous[index].view &&
      content === previous[index].content &&
      lighting === previous[index].lighting,
  );

/**
 * The effect behind `usePond`: the water of each element whose rings run.
 * It owns the element's content while the rings run, and draws it from the
 * snapshot, bent through the water, with the light on the water over it.
 * Until the snapshot is ready, it draws only the light, and the page draws
 * the content flat.
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
              content: frame.drawContent(record, "own"),
              lighting: isLightBackdrop(shownOver(record.fill, backdrop))
                ? LIGHTING.light
                : LIGHTING.dark,
            });
          }
        }
        if (!sameShown(next, shown)) {
          buffer.write(
            next.map(({ elementIndex, view, content, lighting }) => ({
              element: elementIndex,
              stoneCount: view.stones.length,
              content: content ? 1 : 0,
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
