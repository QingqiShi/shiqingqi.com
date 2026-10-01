import { type WmoGroup, wmoGroup } from "./wmo-group";

const CONDITION_ZH: Record<WmoGroup, string> = {
  clear: "晴",
  partly: "多云间晴",
  cloud: "多云",
  fog: "有雾",
  drizzle: "小雨",
  rain: "雨",
  showers: "阵雨",
  snow: "雪",
  thunder: "雷雨",
};

/** Chinese condition label for a raw WMO code. */
export function wmoCondition(code: number): string {
  return CONDITION_ZH[wmoGroup(code)];
}
