import { GPU_SHADER_STAGE, PREMULTIPLIED_BLEND } from "./constants.ts";
import type { EffectPass, EffectSetup, EffectTarget } from "./types.ts";

type Instances = readonly { readonly elementIndex: number }[];

/**
 * The range of `instances` whose elements are in a target's range of
 * `EffectFrame.elements`, as `[first, count]`.
 *
 * @internal
 */
export function instanceRange(
  instances: Instances,
  firstElement: number,
  elementCount: number,
): readonly [number, number] {
  const indexFrom = (element: number) => {
    const index = instances.findIndex(
      ({ elementIndex }) => elementIndex >= element,
    );
    return index === -1 ? instances.length : index;
  };
  const first = indexFrom(firstElement);
  return [first, indexFrom(firstElement + elementCount) - first];
}

/**
 * The render pipeline of an effect that draws one quad for each instance,
 * from the entry points `${entryPrefix}Vertex` and `${entryPrefix}Fragment`
 * of `code`, with `storageBuffers` read-only storage buffers in group 2.
 *
 * @internal
 */
export async function createInstancedDraw(
  { device, format, pageLayout, targetLayout }: EffectSetup,
  code: string,
  entryPrefix: string,
  storageBuffers = 1,
) {
  const layout = device.createBindGroupLayout({
    entries: Array.from({ length: storageBuffers }, (_, binding) => ({
      binding,
      visibility: GPU_SHADER_STAGE.VERTEX | GPU_SHADER_STAGE.FRAGMENT,
      buffer: { type: "read-only-storage" as const },
    })),
  });
  const module = device.createShaderModule({ code });
  const pipeline = await device.createRenderPipelineAsync({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [pageLayout, targetLayout, layout],
    }),
    vertex: { module, entryPoint: `${entryPrefix}Vertex` },
    fragment: {
      module,
      entryPoint: `${entryPrefix}Fragment`,
      targets: [{ format, blend: PREMULTIPLIED_BLEND }],
    },
    primitive: { topology: "triangle-strip" },
  });
  return {
    /** Group 2, which holds the storage buffers. */
    layout,
    /** Draws the instances whose elements are on `target`. */
    draw(
      pass: EffectPass,
      target: EffectTarget,
      instances: Instances,
      binding: () => GPUBindGroup,
    ) {
      const [first, count] = instanceRange(
        instances,
        target.firstElement,
        target.elementCount,
      );
      if (count > 0) {
        pass.setPipeline(pipeline);
        pass.setBindGroup(2, binding());
        pass.draw(4, count, 0, first);
      }
    },
  };
}
