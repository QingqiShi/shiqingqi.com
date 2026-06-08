import { TripView } from "@/components/trip/trip-view";
import { resolveDay } from "@/data/itinerary";

// "Current day" depends on the wall clock, so render per-request.
export const dynamic = "force-dynamic";

export default function HomePage() {
  // Per-request server component (force-dynamic): request time is the intended "now".
  // eslint-disable-next-line @eslint-react/purity
  const { index, phase, daysUntil } = resolveDay(new Date());
  return (
    <TripView currentDayIndex={index} phase={phase} daysUntil={daysUntil} />
  );
}
