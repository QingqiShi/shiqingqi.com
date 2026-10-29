import { d, readFromArrayBuffer, writeToArrayBuffer } from "typegpu";
import { describe, expect, it } from "vitest";
import * as generated from "../_generated/wgsl/layouts.ts";
import * as blackHole from "./black-hole-layout.ts";
import * as dust from "./dust-layout.ts";
import * as liquid from "./liquid-layout.ts";
import * as page from "./page-layout.ts";
import * as ripple from "./ripple-layout.ts";

/**
 * Writes a value whose fields all differ with `data`, and with TypeGPU.
 */
function bothWrites<Schema extends d.AnyWgslData>(
  schema: Schema,
  data: {
    write: (view: DataView, offset: number, value: d.Infer<Schema>) => void;
  },
) {
  const size = d.sizeOf(schema);
  const words = Float32Array.from(
    { length: size / 4 },
    (_, index) => index + 1,
  );
  const value = readFromArrayBuffer(words.buffer, schema);
  const ours = new ArrayBuffer(size);
  data.write(new DataView(ours), 0, value);
  const typegpu = new ArrayBuffer(size);
  writeToArrayBuffer(typegpu, schema, value);
  return { ours: new Uint8Array(ours), typegpu: new Uint8Array(typegpu) };
}

describe("the generated buffer data", () => {
  it("writes the bytes that TypeGPU writes", () => {
    const cases = [
      bothWrites(page.EffectPage, generated.EffectPage),
      bothWrites(page.EffectRange, generated.EffectRange),
      bothWrites(ripple.RippleInstance, generated.RippleInstance),
      bothWrites(blackHole.Scene, generated.Scene),
      bothWrites(liquid.LiquidSlot, generated.LiquidSlot),
      bothWrites(dust.DustSpawn, generated.DustSpawn),
    ];
    for (const { ours, typegpu } of cases) {
      expect(ours).toEqual(typegpu);
    }
  });

  it("has the size, the stride and the offsets of the schema", () => {
    const { LiquidSlot } = liquid;
    expect(generated.LiquidSlot).toMatchObject({
      size: d.sizeOf(LiquidSlot),
      stride: d.sizeOf(LiquidSlot),
      offsets: {
        walls: d.memoryLayoutOf(LiquidSlot, (slot) => slot.walls).offset,
        extent: d.memoryLayoutOf(LiquidSlot, (slot) => slot.extent).offset,
        particles: d.memoryLayoutOf(LiquidSlot, (slot) => slot.particles[0])
          .offset,
      },
    });
    expect(generated.Beam.stride).toBe(
      d.sizeOf(d.arrayOf(blackHole.Beam, 2)) / 2,
    );
  });
});
