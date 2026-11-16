import { t } from "@tuja/i18n";
import type { WmoGroup } from "./weather/wmo-group.ts";

/** Names the weather of a WMO group. */
export function useWeatherCondition() {
  const conditions: Record<WmoGroup, string> = {
    clear: t({ en: "Clear", zh: "晴" }),
    partly: t({ en: "Partly cloudy", zh: "多云间晴" }),
    cloud: t({ en: "Cloudy", zh: "多云" }),
    fog: t({ en: "Fog", zh: "有雾" }),
    drizzle: t({ en: "Drizzle", zh: "小雨" }),
    rain: t({ en: "Rain", zh: "雨" }),
    showers: t({ en: "Showers", zh: "阵雨" }),
    snow: t({ en: "Snow", zh: "雪" }),
    thunder: t({ en: "Thunderstorms", zh: "雷雨" }),
  };
  return (group: WmoGroup) => conditions[group];
}
