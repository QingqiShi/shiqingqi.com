import { TripView } from "@/components/trip/trip-view";
import { resolveDay } from "@/data/itinerary";
import { getTripWeather } from "@/lib/weather";

// "Current day" depends on the wall clock, so render per-request.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Per-request server component (force-dynamic): request time is the intended "now".
  // eslint-disable-next-line @eslint-react/purity
  const { index, phase, daysUntil } = resolveDay(new Date());
  // Live forecast for the days within Open-Meteo's horizon; cached server-side.
  const weatherByDay = await getTripWeather();
  return (
    <TripView
      currentDayIndex={index}
      phase={phase}
      daysUntil={daysUntil}
      weatherByDay={weatherByDay}
    />
  );
}
