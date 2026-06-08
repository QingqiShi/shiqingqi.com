import { Clock, MapPin } from "lucide-react";
import { DayHeader } from "./day-header";
import { DiningSection } from "./dining-section";
import { PlacePill } from "./links";
import { Section } from "./section";
import { StaySection } from "./stay-section";
import { Timeline } from "./timeline";
import type { Day } from "@/data/itinerary";

export function DailyView({
  day,
  isToday,
  onOpenDay,
}: {
  day: Day;
  isToday: boolean;
  onOpenDay: (index: number) => void;
}) {
  return (
    <article className="space-y-6">
      <DayHeader day={day} isToday={isToday} />

      <Section icon={Clock} title="行程">
        <Timeline items={day.timeline} />
      </Section>

      {day.places.length > 0 ? (
        <Section icon={MapPin} title="想去的地方">
          <div className="flex flex-wrap gap-2">
            {day.places.map((place) => (
              <PlacePill key={place.name} place={place} />
            ))}
          </div>
        </Section>
      ) : null}

      <DiningSection restaurants={day.restaurants} />

      <StaySection stay={day.stay} onOpenDay={onOpenDay} />
    </article>
  );
}
