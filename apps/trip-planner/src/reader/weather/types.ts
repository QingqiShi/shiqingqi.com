/** Live weather for a single day, derived from Open-Meteo. */
export interface LiveWeather {
  /** Temperature range for the day, e.g. "12–17°C". */
  temp: string;
  /** Raw WMO weather code, for the condition and its icon. */
  code: number;
  /** The trip-local date the forecast was fetched, as "YYYY-MM-DD". It is the
   *  same for every day of one fetch. */
  updated: string;
}
