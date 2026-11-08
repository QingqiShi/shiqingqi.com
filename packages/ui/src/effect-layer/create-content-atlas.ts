import { GPU_TEXTURE_USAGE } from "./constants.ts";
import { packShelves, type Place } from "./pack-shelves.ts";

/**
 * The clear texels round each image, so that a filtered sample at its edge
 * takes nothing of the next image.
 */
const GAP = 2;
const MIN_WIDTH = 256;

const nextPowerOfTwo = (value: number) =>
  2 ** Math.ceil(Math.log2(Math.max(value, 1)));

/**
 * One texture that holds the image of the content of each element, by the
 * element's id, on shelves, so that one draw of an effect reads the content
 * of every element. An element whose image changes size, or a new element,
 * packs every image again into a new texture before the next read.
 *
 * @internal
 */
export function createContentAtlas(device: GPUDevice) {
  const limit = device.limits.maxTextureDimension2D;
  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });
  const images = new Map<number, HTMLCanvasElement>();
  let places = new Map<number, Place>();
  let texture = createTexture(1, 1);
  let view = texture.createView();
  let unpacked = false;

  function createTexture(width: number, height: number) {
    return device.createTexture({
      label: "effectContent",
      size: [width, height],
      format: "rgba8unorm",
      usage:
        GPU_TEXTURE_USAGE.TEXTURE_BINDING |
        GPU_TEXTURE_USAGE.COPY_DST |
        GPU_TEXTURE_USAGE.RENDER_ATTACHMENT,
    });
  }

  function upload(id: number) {
    const canvas = images.get(id);
    const place = places.get(id);
    if (canvas === undefined || place === undefined) {
      return;
    }
    try {
      device.queue.copyExternalImageToTexture(
        { source: canvas },
        { texture, origin: [place.x, place.y], premultipliedAlpha: true },
        [canvas.width, canvas.height],
      );
    } catch {
      images.delete(id);
      places.delete(id);
    }
  }

  function repack() {
    if (!unpacked) {
      return;
    }
    unpacked = false;
    const entries = [...images];
    const sizes = entries.map(([, { width, height }]) => ({ width, height }));
    const widest = Math.max(0, ...sizes.map(({ width }) => width));
    const width = Math.min(
      limit,
      Math.max(MIN_WIDTH, nextPowerOfTwo(widest + 2 * GAP)),
    );
    const packed = packShelves(sizes, width, GAP);
    const height = Math.min(limit, nextPowerOfTwo(packed.height));
    places = new Map();
    entries.forEach(([id], index) => {
      const place = packed.places[index];
      if (place !== null && place.y + sizes[index].height + GAP <= height) {
        places.set(id, place);
      }
    });
    // A new texture is clear, so no texel of an old image stays in a gap.
    texture.destroy();
    texture = createTexture(width, height);
    view = texture.createView();
    for (const id of places.keys()) {
      upload(id);
    }
  }

  return {
    sampler,
    /** The view of the texture, which changes when the images pack again. */
    view: () => {
      repack();
      return view;
    },
    put(id: number, canvas: HTMLCanvasElement) {
      const previous = images.get(id);
      images.set(id, canvas);
      if (
        !unpacked &&
        previous?.width === canvas.width &&
        previous.height === canvas.height &&
        places.has(id)
      ) {
        upload(id);
      } else {
        unpacked = true;
      }
    },
    remove(id: number) {
      images.delete(id);
      places.delete(id);
    },
    /**
     * Where the image of `id` is in the texture, in texels, with the size of
     * the texture, or `undefined` when it has none.
     */
    placeOf(id: number) {
      repack();
      const place = places.get(id);
      return place === undefined
        ? undefined
        : {
            ...place,
            textureWidth: texture.width,
            textureHeight: texture.height,
          };
    },
    destroy() {
      texture.destroy();
      images.clear();
      places.clear();
    },
  };
}
