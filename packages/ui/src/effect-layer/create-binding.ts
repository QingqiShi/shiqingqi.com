/**
 * The bind group of `buffers`, made again when one of them is replaced.
 *
 * @internal
 */
export function createBinding(
  device: GPUDevice,
  layout: GPUBindGroupLayout,
  buffers: readonly { readonly buffer: GPUBuffer }[],
) {
  let bound: readonly GPUBuffer[] = [];
  let bindGroup: GPUBindGroup | null = null;
  return () => {
    const current = buffers.map(({ buffer }) => buffer);
    if (
      bindGroup === null ||
      current.some((buffer, index) => buffer !== bound[index])
    ) {
      bound = current;
      bindGroup = device.createBindGroup({
        layout,
        entries: current.map((buffer, binding) => ({
          binding,
          resource: { buffer },
        })),
      });
    }
    return bindGroup;
  };
}
