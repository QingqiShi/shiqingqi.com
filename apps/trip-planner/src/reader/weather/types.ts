/** Live weather for a single day, derived from Open-Meteo. */
export interface LiveWeather {
  /** Temperature range for the day, e.g. "12–17°C". */
  temp: string;
  /** Chinese condition label derived from the WMO code, e.g. "多云". */
  condition: string;
  /** Raw WMO weather code, so the badge can pick a matching icon. */
  code: number;
  /** When the forecast was last fetched, e.g. "6/9 更新" — marks the day as
   *  live and shows its freshness. Identical across days (one fetch). */
  updated: string;
}
