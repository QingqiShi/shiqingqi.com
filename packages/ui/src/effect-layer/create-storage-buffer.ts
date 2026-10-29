import type { d } from "typegpu";
import { GPU_BUFFER_USAGE } from "./constants.ts";
import type { EffectBuffer, EffectData, EffectInput } from "./types.ts";

/**
 * A storage buffer of an array of `Item`.
 *
 * @internal
 */
export interface EffectStorage<Item extends d.AnyWgslData> extends EffectBuffer<
  d.WgslArray<Item>,
  "storage"
> {
  /** Uploads `values` to the start of the array. */
  readonly write: (values: readonly EffectInput<Item>[]) => void;
  readonly destroy: () => void;
}

/**
 * A storage buffer that holds an array of `count` values of `item`.
 *
 * @internal
 */
export function createStorageBuffer<Item extends d.AnyWgslData>(
  device: GPUDevice,
  item: EffectData<Item>,
  count: number,
) {
  const size = item.stride * count;
  const buffer = device.createBuffer({
    label: item.label,
    size,
    usage:
      GPU_BUFFER_USAGE.STORAGE |
      GPU_BUFFER_USAGE.COPY_DST |
      GPU_BUFFER_USAGE.COPY_SRC,
  });
  let view: DataView | null = null;
  const storage: EffectStorage<Item> = {
    buffer,
    usage: "storage",
    write(values) {
      view ??= new DataView(new ArrayBuffer(size));
      const length = Math.min(values.length, count);
      for (let index = 0; index < length; index++) {
        item.write(view, index * item.stride, values[index]);
      }
      device.queue.writeBuffer(buffer, 0, view.buffer, 0, length * item.stride);
    },
    destroy() {
      buffer.destroy();
    },
  };
  return storage;
}
