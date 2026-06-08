/**
 * WMO weather-interpretation codes (Open-Meteo's `weather_code`) folded into the
 * handful of conditions the planner cares about, each with a Chinese label.
 *
 * Pure and isomorphic on purpose: the server fetch derives the label from a code
 * and the client badge derives an icon from the same code, so both share one
 * source of truth for what a code means.
 *
 * Code reference: https://open-meteo.com/en/docs (WMO 4677 subset).
 */

export type WmoGroup =
  | "clear"
  | "partly"
  | "cloud"
  | "fog"
  | "drizzle"
  | "rain"
  | "showers"
  | "snow"
  | "thunder";

/** Live weather for a single day, derived from Open-Meteo. */
export interface LiveWeather {
  /** Temperature range for the day, e.g. "12–17°C". */
  temp: string;
  /** Chinese condition label derived from the WMO code, e.g. "多云". */
  condition: string;
  /** Raw WMO weather code, so the badge can pick a matching icon. */
  code: number;
}

/** Collapse a raw WMO code into one of the planner's coarse condition groups. */
export function wmoGroup(code: number): WmoGroup {
  if (code <= 0) return "clear"; // 0 clear sky
  if (code <= 2) return "partly"; // 1–2 mainly clear / partly cloudy
  if (code === 3) return "cloud"; // 3 overcast
  if (code <= 48) return "fog"; // 45, 48 fog
  if (code <= 57) return "drizzle"; // 51–57 drizzle
  if (code <= 67) return "rain"; // 61–67 rain
  if (code <= 77) return "snow"; // 71–77 snowfall
  if (code <= 82) return "showers"; // 80–82 rain showers
  if (code <= 86) return "snow"; // 85–86 snow showers
  return "thunder"; // 95, 96, 99 thunderstorm
}

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
