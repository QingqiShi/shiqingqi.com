import type { d } from "typegpu";
import { GPU_BUFFER_USAGE } from "./constants.ts";
import type { EffectBuffer, EffectData, EffectInput } from "./types.ts";

/**
 * A uniform buffer of one value of `Schema`.
 *
 * @internal
 */
export interface EffectUniform<
  Schema extends d.AnyWgslData,
> extends EffectBuffer<Schema, "uniform"> {
  /** Uploads `value`. */
  readonly write: (value: EffectInput<Schema>) => void;
  readonly destroy: () => void;
}

/**
 * A uniform buffer that holds one value of `data`.
 *
 * @internal
 */
export function createUniformBuffer<Schema extends d.AnyWgslData>(
  device: GPUDevice,
  data: EffectData<Schema>,
) {
  const buffer = device.createBuffer({
    label: data.label,
    size: data.size,
    usage:
      GPU_BUFFER_USAGE.UNIFORM |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC,
  });
  const packed = new ArrayBuffer(data.size);
  const view = new DataView(packed);
  const uniform: EffectUniform<Schema> = {
    buffer,
    usage: "uniform",
    write(value) {
      data.write(view, 0, value);
      device.queue.writeBuffer(buffer, 0, packed);
    },
    destroy() {
      buffer.destroy();
    },
  };
  return uniform;
}
