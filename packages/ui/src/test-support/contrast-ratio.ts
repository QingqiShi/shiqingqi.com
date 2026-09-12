import { hexChannels } from "./hex-channels.ts";

function channelToLinear(value8Bit: number) {
  const v = value8Bit / 255;
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}

/** @internal */
export function relativeLuminance(hex: string) {
  const [r, g, b] = hexChannels(hex).map(channelToLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** @internal */
export function contrastRatio(a: string, b: string) {
  const [x, y] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
