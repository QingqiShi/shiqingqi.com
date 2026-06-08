/**
 * Live weather for the trip, from Open-Meteo's free forecast API (no key).
 *
 * Server-only: imported solely by the server page. We fetch every day's
 * representative point in a single batched request, then map each trip day to a
 * forecast *only* when its date falls inside the forecast horizon (~16 days).
 * Days beyond the horizon — and any fetch failure — are intentionally left out
 * of the result so the UI falls back to the hand-authored seasonal guess. That
 * keeps the page as unbreakable as it was when the weather was fully static.
 */

import { unstable_cache } from "next/cache";
import { type LiveWeather, wmoCondition } from "./wmo";
import { trip } from "@/data/itinerary";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Open-Meteo's free daily forecast reaches ~16 days out. */
const FORECAST_DAYS = 16;

/** Refresh a few times a day — forecasts update roughly that often. */
const REVALIDATE_SECONDS = 3 * 60 * 60;

interface WeatherPoint {
  n: number;
  date: string;
  lat: number;
  lon: number;
}

/** Days carrying both coordinates and a weather slot — the ones we can fetch. */
function weatherPoints(): WeatherPoint[] {
  return trip.days.flatMap((day) =>
    day.coords && day.weather
      ? [{ n: day.n, date: day.date, lat: day.coords.lat, lon: day.coords.lon }]
      : [],
  );
}

// Open-Meteo returns `null` in the daily arrays for any day it can't resolve —
// typically the last day or two at the edge of the forecast horizon. We must
// accept those nulls at the array level and skip only the individual null day,
// rather than discarding the whole location.
function isNullableNumberArray(value: unknown): value is (number | null)[] {
  return (
    Array.isArray(value) &&
    value.every((x) => x === null || typeof x === "number")
  );
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((x) => typeof x === "string");
}

interface DailyBlock {
  time: string[];
  weather_code: (number | null)[];
  temperature_2m_max: (number | null)[];
  temperature_2m_min: (number | null)[];
}

/** Narrow one location's payload to the daily arrays we need, or give up. */
function asDailyBlock(value: unknown): DailyBlock | undefined {
  if (typeof value !== "object" || value === null || !("daily" in value)) {
    return undefined;
  }
  const daily = value.daily;
  if (typeof daily !== "object" || daily === null) return undefined;

  const time = "time" in daily ? daily.time : undefined;
  const code = "weather_code" in daily ? daily.weather_code : undefined;
  const max =
    "temperature_2m_max" in daily ? daily.temperature_2m_max : undefined;
  const min =
    "temperature_2m_min" in daily ? daily.temperature_2m_min : undefined;

  if (
    isStringArray(time) &&
    isNullableNumberArray(code) &&
    isNullableNumberArray(max) &&
    isNullableNumberArray(min)
  ) {
    return {
      time,
      weather_code: code,
      temperature_2m_max: max,
      temperature_2m_min: min,
    };
  }
  return undefined;
}

function readForecast(
  daily: DailyBlock,
  date: string,
): LiveWeather | undefined {
  const i = daily.time.indexOf(date);
  if (i < 0) return undefined; // date is beyond the forecast horizon
  const code = daily.weather_code[i];
  const min = daily.temperature_2m_min[i];
  const max = daily.temperature_2m_max[i];
  // An unresolved (null) day falls back to the hand-authored seasonal guess.
  if (code === null || min === null || max === null) return undefined;
  return {
    temp: `${String(Math.round(min))}–${String(Math.round(max))}°C`,
    condition: wmoCondition(code),
    code,
  };
}

async function fetchTripWeather(): Promise<Record<number, LiveWeather>> {
  const points = weatherPoints();
  if (points.length === 0) return {};

  const params = new URLSearchParams({
    latitude: points.map((p) => String(p.lat)).join(","),
    longitude: points.map((p) => String(p.lon)).join(","),
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "Europe/London",
    forecast_days: String(FORECAST_DAYS),
  });

  const result: Record<number, LiveWeather> = {};
  try {
    const response = await fetch(`${FORECAST_URL}?${params.toString()}`);
    if (!response.ok) return result;
    const body: unknown = await response.json();
    // One coordinate returns a single object; many return an aligned array.
    const blocks = Array.isArray(body) ? body : [body];
    points.forEach((point, i) => {
      const daily = asDailyBlock(blocks[i]);
      if (!daily) return;
      const live = readForecast(daily, point.date);
      if (live) result[point.n] = live;
    });
  } catch {
    return {};
  }
  return result;
}

/**
 * Live weather keyed by day number, cached so we hit Open-Meteo only a few
 * times a day rather than on every request. `unstable_cache` keeps its own
 * revalidation independent of the page's `force-dynamic` rendering.
 */
export const getTripWeather = unstable_cache(
  fetchTripWeather,
  ["trip-weather-v1"],
  { revalidate: REVALIDATE_SECONDS },
);
