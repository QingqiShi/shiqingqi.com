import {
  describeError,
  instrumentEffectDevice,
  setEffectStatus,
} from "./effect-diagnostics.ts";

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
  setEffectStatus(
    "gpu",
    `navigator.gpu ${"gpu" in navigator ? "present" : "MISSING"}, isSecureContext ${String(window.isSecureContext)}`,
  );
  if (!("gpu" in navigator)) {
    return null;
  }
  try {
    const adapter = await navigator.gpu.requestAdapter({
      powerPreference: "low-power",
    });
    if (adapter === null) {
      setEffectStatus("adapter", "requestAdapter returned null");
      return null;
    }
    const { info } = adapter;
    setEffectStatus(
      "adapter",
      `${info.vendor} ${info.architecture} ${info.device} ${info.description}`,
    );
    const device = await adapter.requestDevice();
    const { limits } = device;
    setEffectStatus(
      "device",
      `ok; storage/stage ${String(limits.maxStorageBuffersPerShaderStage)}, bind groups ${String(limits.maxBindGroups)}, storage size ${String(limits.maxStorageBufferBindingSize)}, uniform size ${String(limits.maxUniformBufferBindingSize)}, tex2d ${String(limits.maxTextureDimension2D)}`,
    );
    instrumentEffectDevice(device);
    const format = navigator.gpu.getPreferredCanvasFormat();
    setEffectStatus("format", format);
    return { device, format };
  } catch (error) {
    setEffectStatus("device", `request threw ${describeError(error)}`);
    return null;
  }
}
