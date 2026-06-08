import { Clock, MapPin } from "lucide-react";
import { ChecklistSection } from "./checklist-section";
import { DayGlance } from "./day-glance";
import { DayHeader } from "./day-header";
import { DiningSection } from "./dining-section";
import { PlacePill } from "./links";
import { NavSection } from "./nav-section";
import { Section } from "./section";
import { StaySection } from "./stay-section";
import { Timeline } from "./timeline";
import { TipsSection } from "./tips-section";
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

      {day.anchors && day.anchors.length > 0 ? (
        <DayGlance anchors={day.anchors} />
      ) : null}

      {day.nav && day.nav.length > 0 ? <NavSection legs={day.nav} /> : null}

      <Section icon={Clock} title="行程">
        <Timeline items={day.timeline} />
      </Section>

      {day.checklists && day.checklists.length > 0 ? (
        <ChecklistSection dayN={day.n} checklists={day.checklists} />
      ) : null}

      {day.places.length > 0 ? (
        <Section icon={MapPin} title="想去的地方">
          <div className="flex flex-wrap gap-2">
            {day.places.map((place) => (
              <PlacePill key={place.name} place={place} />
            ))}
          </div>
        </Section>
      ) : null}

      {day.restaurants.length > 0 ? (
        <DiningSection restaurants={day.restaurants} />
      ) : null}

      {day.tips && day.tips.length > 0 ? <TipsSection tips={day.tips} /> : null}

      <StaySection stay={day.stay} onOpenDay={onOpenDay} />
    </article>
  );
}
