"use client";

import { Clock, MapPin } from "lucide-react";
import { DayGlance } from "./day-glance";
import { DayHeader } from "./day-header";
import { dayHighlights } from "./day-highlights";
import { DiningList } from "./dining-list";
import { PlaceList } from "./place-list";
import { presencesOnDay } from "./presences-on-day";
import { Section } from "./section";
import { StaySection } from "./stay-section";
import { TipsSection } from "./tips-section";
import { DayFeed } from "@/reader/day-feed/day-feed";
import { momentDomId } from "@/reader/day-feed/moment-dom-id";
import { DayMap } from "@/reader/maps/day-map";
import type { LiveWeather } from "@/reader/weather/types";
import type { Day, Trip } from "@/trips/types";

export function DailyView({
  trip,
  day,
  dayIndex,
  isToday,
  liveWeather,
  onOpenDay,
}: {
  trip: Trip;
  day: Day;
  dayIndex: number;
  isToday: boolean;
  liveWeather?: LiveWeather;
  onOpenDay: (index: number) => void;
}) {
  const highlights = dayHighlights(day);
  const extraDining = day.dining;
  const extraPlaces = day.places;
  const generalTips = day.tips;
  const sameAsDayId = day.stay.sameAs?.dayId;
  const sameAsIndex = sameAsDayId
    ? trip.days.findIndex((other) => other.id === sameAsDayId)
    : -1;

  const jumpToMoment = (momentId: string) => {
    const target = document.getElementById(momentDomId(momentId));
    if (!target) return;
    target.scrollIntoView({ block: "start" });
  };

  return (
    <article className="space-y-6">
      <DayHeader
        day={day}
        dayNumber={dayIndex}
        people={presencesOnDay(trip.people, day.id)}
        isToday={isToday}
        liveWeather={liveWeather}
      />

      {highlights.length > 0 ? (
        <DayGlance highlights={highlights} onJump={jumpToMoment} />
      ) : null}

      {generalTips.length > 0 ? (
        <TipsSection tips={generalTips} title="今日须知" />
      ) : null}

      <DayMap day={day} />

      <Section icon={Clock} title="行程">
        <DayFeed
          tripSlug={trip.slug}
          timeZone={trip.timeZone}
          day={day}
          isToday={isToday}
        />
      </Section>

      {extraDining.length > 0 ? (
        <Section icon={MapPin} title="餐饮选择">
          <DiningList restaurants={extraDining} />
        </Section>
      ) : null}

      {extraPlaces.length > 0 ? (
        <Section icon={MapPin} title="想去的地方">
          <PlaceList places={extraPlaces} />
        </Section>
      ) : null}

      <StaySection
        stay={day.stay}
        sameAsIndex={sameAsIndex < 0 ? undefined : sameAsIndex}
        onOpenDay={onOpenDay}
      />
    </article>
  );
}
