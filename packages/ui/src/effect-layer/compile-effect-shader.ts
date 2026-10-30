import type { AnyEffectLayout } from "./create-binding.ts";
import { bindGroupLayoutOf } from "./create-binding.ts";

/**
 * A pipeline's shader as `codegen/generate-wgsl.ts` resolves it from TGSL:
 * the WGSL, with one entry point for each stage, and the bind group layout
 * of each group it reads, at the index of the group, or `null` for a group
 * it does not read.
 *
 * @internal
 */
export interface EffectShader {
  readonly label: string;
  readonly layouts: readonly (AnyEffectLayout | null)[];
  readonly code: string;
}

/**
 * Makes pipelines of `shader` without blocking. The shader compiles to one
 * shader module, on the first call, which every pipeline shares. A failure
 * rejects the promise.
 *
 * @internal
 */
export function compileEffectShader(device: GPUDevice, shader: EffectShader) {
  const { label } = shader;
  let compiled: {
    module: GPUShaderModule;
    layout: GPUPipelineLayout;
  } | null = null;
  const compile = () =>
    (compiled ??= {
      module: device.createShaderModule({ label, code: shader.code }),
      layout: device.createPipelineLayout({
        label,
        bindGroupLayouts: shader.layouts.map((layout) =>
          layout === null ? null : bindGroupLayoutOf(device, layout),
        ),
      }),
    });
  return {
    /** A render pipeline that draws `primitive` to `target`. */
    async render(target: GPUColorTargetState, primitive?: GPUPrimitiveState) {
      const { module, layout } = compile();
      return await device.createRenderPipelineAsync({
        label,
        layout,
        vertex: { module },
        fragment: { module, targets: [target] },
        primitive,
      });
    },
    /** The compute pipeline. */
    async compute() {
      const { module, layout } = compile();
      return await device.createComputePipelineAsync({
        label,
        layout,
        compute: { module },
      });
    },
  };
}
