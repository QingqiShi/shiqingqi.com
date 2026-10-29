import { setBindGroup } from "./set-bind-group.ts";
import type { EffectPass } from "./types.ts";

/**
 * Runs `draw` on the render pass of one `<canvas>` element, which `begin`
 * starts: it clears the canvas, and the canvas shows it once it is
 * submitted. The pass begins only at the first call that draws something,
 * so that a canvas nothing draws on costs nothing. A canvas that no pass
 * draws on keeps what it shows, so one that `shown` says shows something
 * still gets a pass, with nothing on it, which clears it. Returns whether
 * the canvas shows something now.
 *
 * @internal
 */
export function encodeCanvasPass(
  begin: () => GPURenderPassEncoder,
  shown: boolean,
  draw: (pass: EffectPass) => void,
) {
  const begun: { pass: GPURenderPassEncoder | null } = { pass: null };
  draw({
    draw(
      pipeline,
      group,
      vertexCount,
      instanceCount = 1,
      firstVertex = 0,
      firstInstance = 0,
    ) {
      if (vertexCount === 0 || instanceCount === 0) {
        return;
      }
      begun.pass ??= begin();
      begun.pass.setPipeline(pipeline);
      if (group !== null) {
        setBindGroup(begun.pass, group);
      }
      begun.pass.draw(vertexCount, instanceCount, firstVertex, firstInstance);
    },
  });
  const drawn = begun.pass !== null;
  if (begun.pass === null && shown) {
    begun.pass = begin();
  }
  begun.pass?.end();
  return drawn;
}
