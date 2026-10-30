import type { d } from "typegpu";
import { createStorageBuffer } from "./create-storage-buffer.ts";
import type { EffectData, EffectInput } from "./types.ts";

const MIN_CAPACITY = 16;

/**
 * A storage buffer that holds an array of `item`, grows as it needs, and
 * uploads only when its values change.
 *
 * @internal
 */
export function createPackedBuffer<Item extends d.AnyWgslData>(
  device: GPUDevice,
  item: EffectData<Item>,
) {
  const { stride } = item;
  const allocate = (capacity: number) => ({
    capacity,
    buffer: createStorageBuffer(device, item, capacity),
    packed: new ArrayBuffer(capacity * stride),
    previous: new ArrayBuffer(capacity * stride),
    previousCount: -1,
  });
  let state = allocate(MIN_CAPACITY);
  return {
    /** Replaced when the buffer grows. */
    get buffer() {
      return state.buffer;
    },
    /**
     * Packs the values, and uploads them when they differ from the last
     * upload. Returns whether they did.
     */
    write(values: readonly EffectInput<Item>[]) {
      const capacity = Math.max(
        MIN_CAPACITY,
        2 ** Math.ceil(Math.log2(values.length)),
      );
      if (capacity !== state.capacity) {
        state.buffer.destroy();
        state = allocate(capacity);
      }
      [state.packed, state.previous] = [state.previous, state.packed];
      const view = new DataView(state.packed);
      for (const [index, value] of values.entries()) {
        item.write(view, index * stride, value);
      }
      const words = new Uint32Array(
        state.packed,
        0,
        (values.length * stride) / 4,
      );
      const previous = new Uint32Array(state.previous, 0, words.length);
      if (
        values.length === state.previousCount &&
        words.every((word, index) => word === previous[index])
      ) {
        return false;
      }
      state.previousCount = values.length;
      device.queue.writeBuffer(state.buffer.buffer, 0, words);
      return true;
    },
    destroy() {
      state.buffer.destroy();
    },
  };
}
