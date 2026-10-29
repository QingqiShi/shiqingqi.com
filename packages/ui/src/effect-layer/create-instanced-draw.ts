import {
  compileEffectShader,
  type EffectShader,
} from "./compile-effect-shader.ts";
import type { EffectBindGroup } from "./create-binding.ts";
import type { EffectPass, EffectTarget } from "./types.ts";

type Instances = readonly { readonly elementIndex: number }[];

/**
 * The primitive of a pipeline that draws quads of 4 vertices.
 *
 * @internal
 */
export const QUAD_STRIP = { topology: "triangle-strip" } as const;

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
 * Draws one quad of 4 vertices for each instance with `shader`, as a
 * `QUAD_STRIP`, and the effect's own group.
 *
 * @internal
 */
export async function createInstancedDraw(
  device: GPUDevice,
  shader: EffectShader,
  target: GPUColorTargetState,
) {
  const pipeline = await compileEffectShader(device, shader).render(
    target,
    QUAD_STRIP,
  );
  return {
    /** Draws the instances whose elements are on `target`. */
    draw(
      pass: EffectPass,
      target: EffectTarget,
      instances: Instances,
      group: () => EffectBindGroup,
    ) {
      const [first, count] = instanceRange(
        instances,
        target.firstElement,
        target.elementCount,
      );
      if (count > 0) {
        pass.draw(pipeline, group(), 4, count, 0, first);
      }
    },
  };
}
