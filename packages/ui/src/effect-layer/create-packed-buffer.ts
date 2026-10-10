import { GPU_BUFFER_USAGE } from "./constants.ts";

const MIN_CAPACITY = 16;

/**
 * A storage buffer that holds packed items, grows as they need, and uploads
 * only when they change.
 *
 * @internal
 */
export function createPackedBuffer<Item>(
  device: GPUDevice,
  itemBytes: number,
  pack: (items: readonly Item[], buffer: ArrayBuffer) => void,
) {
  const create = (capacity: number) => ({
    capacity,
    buffer: device.createBuffer({
      size: capacity * itemBytes,
      usage: GPU_BUFFER_USAGE.STORAGE | GPU_BUFFER_USAGE.COPY_DST,
    }),
    packed: new ArrayBuffer(capacity * itemBytes),
    previous: new ArrayBuffer(capacity * itemBytes),
    previousCount: -1,
  });
  let state = create(MIN_CAPACITY);
  return {
    get buffer() {
      return state.buffer;
    },
    /**
     * Packs the items, and uploads them when they differ from the last
     * upload. Returns whether they did.
     */
    write(items: readonly Item[]) {
      const capacity = Math.max(
        MIN_CAPACITY,
        2 ** Math.ceil(Math.log2(items.length)),
      );
      if (capacity !== state.capacity) {
        state.buffer.destroy();
        state = create(capacity);
      }
      [state.packed, state.previous] = [state.previous, state.packed];
      pack(items, state.packed);
      const words = new Uint32Array(
        state.packed,
        0,
        (items.length * itemBytes) / 4,
      );
      const previous = new Uint32Array(state.previous, 0, words.length);
      if (
        items.length === state.previousCount &&
        words.every((word, index) => word === previous[index])
      ) {
        return false;
      }
      state.previousCount = items.length;
      device.queue.writeBuffer(state.buffer, 0, words);
      return true;
    },
    destroy() {
      state.buffer.destroy();
    },
  };
}
