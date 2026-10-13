import type { EffectPass } from "./types.ts";

type RenderPass = EffectPass & Pick<GPURenderPassEncoder, "end">;

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
  begin: () => RenderPass,
  shown: boolean,
  draw: (pass: EffectPass) => void,
) {
  const queued: ((pass: RenderPass) => void)[] = [];
  const begun: { pass: RenderPass | null } = { pass: null };
  const run = (call: (pass: RenderPass) => void) => {
    if (begun.pass === null) {
      queued.push(call);
    } else {
      call(begun.pass);
    }
  };
  draw({
    setPipeline(pipeline) {
      run((pass) => {
        pass.setPipeline(pipeline);
      });
    },
    setBindGroup(index, bindGroup) {
      run((pass) => {
        pass.setBindGroup(index, bindGroup);
      });
    },
    setVertexBuffer(slot, buffer) {
      run((pass) => {
        pass.setVertexBuffer(slot, buffer);
      });
    },
    draw(vertexCount, instanceCount = 1, firstVertex = 0, firstInstance = 0) {
      if (vertexCount === 0 || instanceCount === 0) {
        return;
      }
      if (begun.pass === null) {
        begun.pass = begin();
        for (const call of queued) {
          call(begun.pass);
        }
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
