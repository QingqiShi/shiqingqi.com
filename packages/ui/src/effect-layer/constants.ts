// TypeScript's DOM library declares the WebGPU flag types, but not the
// GPUBufferUsage and GPUShaderStage namespaces that hold the values. These
// values come from the WebGPU specification.

/** @internal */
export const GPU_BUFFER_USAGE = {
  COPY_DST: 0x0008,
  VERTEX: 0x0020,
  UNIFORM: 0x0040,
  STORAGE: 0x0080,
} as const;

/** @internal */
export const GPU_SHADER_STAGE = {
  VERTEX: 0x1,
  FRAGMENT: 0x2,
  COMPUTE: 0x4,
} as const;

/**
 * Draws a premultiplied colour over what the pass holds already, the way the
 * `<canvas>` elements composite over the page.
 *
 * @internal
 */
export const PREMULTIPLIED_BLEND: GPUBlendState = {
  color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
  alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
};
