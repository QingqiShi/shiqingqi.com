import { describe, expect, it } from "vitest";
import { encodeCanvasPass } from "./encode-canvas-pass.ts";
import type { EffectPass } from "./types.ts";

/**
 * The frames of one `<canvas>` element: each begins a pass at most once,
 * which stands for presenting the canvas, and records the calls on it.
 */
function createCanvas() {
  let shown = true;
  const presented: string[][] = [];
  const pipeline: GPURenderPipeline = {
    label: "pipeline",
    getBindGroupLayout: () => ({ label: "layout" }),
  };
  return {
    pipeline,
    /** Runs a frame, and returns the calls on its pass, or `null` for none. */
    frame(draw: (pass: EffectPass) => void) {
      const before = presented.length;
      shown = encodeCanvasPass(
        () => {
          const begun: string[] = [];
          presented.push(begun);
          return {
            setPipeline: () => begun.push("setPipeline"),
            setBindGroup: (index) =>
              begun.push(`setBindGroup ${String(index)}`),
            setVertexBuffer: () => begun.push("setVertexBuffer"),
            draw: (vertexCount, instanceCount = 1) =>
              begun.push(
                `draw ${String(vertexCount)}x${String(instanceCount)}`,
              ),
            end: () => begun.push("end"),
          };
        },
        shown,
        draw,
      );
      expect(presented.length - before).toBeLessThanOrEqual(1);
      return presented.at(before) ?? null;
    },
    presented,
  };
}

const drawsQuad = (pipeline: GPURenderPipeline) => (pass: EffectPass) => {
  pass.setPipeline(pipeline);
  pass.draw(4, 2);
};
const drawsNothing = (pipeline: GPURenderPipeline) => (pass: EffectPass) => {
  pass.setBindGroup(0, null);
  pass.setPipeline(pipeline);
  pass.draw(4, 0);
};

describe("encodeCanvasPass", () => {
  it("begins the pass at the first draw, after the calls before it", () => {
    const canvas = createCanvas();
    expect(
      canvas.frame((pass) => {
        pass.setBindGroup(0, null);
        drawsQuad(canvas.pipeline)(pass);
        pass.draw(3);
      }),
    ).toEqual(["setBindGroup 0", "setPipeline", "draw 4x2", "draw 3x1", "end"]);
  });

  it("presents a canvas nothing draws on only once, to clear what it showed", () => {
    const canvas = createCanvas();
    canvas.frame(drawsQuad(canvas.pipeline));
    expect(canvas.frame(drawsNothing(canvas.pipeline))).toEqual(["end"]);
    expect(canvas.frame(drawsNothing(canvas.pipeline))).toBeNull();
    expect(canvas.frame(() => undefined)).toBeNull();
    expect(canvas.presented).toHaveLength(2);
  });

  it("clears a new canvas once, since it may show an earlier pass", () => {
    const canvas = createCanvas();
    expect(canvas.frame(drawsNothing(canvas.pipeline))).toEqual(["end"]);
    expect(canvas.frame(drawsNothing(canvas.pipeline))).toBeNull();
  });

  it("presents the canvas again once something draws on it", () => {
    const canvas = createCanvas();
    canvas.frame(() => undefined);
    canvas.frame(() => undefined);
    expect(canvas.frame(drawsQuad(canvas.pipeline))).toEqual([
      "setPipeline",
      "draw 4x2",
      "end",
    ]);
    expect(canvas.frame(drawsQuad(canvas.pipeline))).toHaveLength(3);
    expect(canvas.frame(() => undefined)).toEqual(["end"]);
  });
});
