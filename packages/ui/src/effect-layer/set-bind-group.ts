import type { EffectBindGroup } from "./create-binding.ts";

/**
 * Sets `group` on `pass` at the index that its layout declares.
 *
 * @internal
 */
export function setBindGroup(
  pass: GPUBindingCommandsMixin,
  { index, bindGroup }: EffectBindGroup,
) {
  pass.setBindGroup(index, bindGroup);
}

/**
 * Encodes one compute pass that runs `pipeline` over `workgroups`
 * workgroups, with `groups` set.
 *
 * @internal
 */
export function dispatch(
  encoder: GPUCommandEncoder,
  pipeline: GPUComputePipeline,
  groups: readonly EffectBindGroup[],
  workgroups: number,
) {
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  for (const group of groups) {
    setBindGroup(pass, group);
  }
  pass.dispatchWorkgroups(workgroups);
  pass.end();
}
