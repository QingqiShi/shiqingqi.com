/**
 * The one device that every `<canvas>` element of the effect layer shares,
 * and the colour format they are configured with.
 *
 * @internal
 */
export interface EffectDevice {
  readonly device: GPUDevice;
  readonly format: GPUTextureFormat;
}

/**
 * Requests the effect layer's device, or `null` when the browser has no
 * WebGPU or no adapter for it.
 *
 * @internal
 */
export async function requestEffectDevice(): Promise<EffectDevice | null> {
  if (!("gpu" in navigator)) {
    return null;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "low-power",
    });
    if (adapter === null) {
      return null;
    }
    const device = await adapter.requestDevice();
    return { device, format: navigator.gpu.getPreferredCanvasFormat() };
  } catch {
    return null;
  }
}
