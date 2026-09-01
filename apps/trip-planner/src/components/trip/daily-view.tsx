"use client";

import { Clock, MapPin } from "lucide-react";
import { DayFeed } from "./day-feed";
import { DayGlance } from "./day-glance";
import { DayHeader } from "./day-header";
import { DayMap } from "./day-map";
import { DiningList } from "./dining-list";
import { PlaceList } from "./place-list";
import { Section } from "./section";
import { StaySection } from "./stay-section";
import { TipsSection } from "./tips-section";
import type { Day, Trip } from "@/data/types";
import { presencesOnDay } from "@/lib/presences-on-day";
import { buildDayFeed } from "@/lib/schedule/build-day-feed";
import { dayWideTips } from "@/lib/schedule/day-wide-tips";
import { momentDomId } from "@/lib/schedule/moment-dom-id";
import { untimedDining } from "@/lib/schedule/untimed-dining";
import { untimedPlaces } from "@/lib/schedule/untimed-places";
import type { LiveWeather } from "@/lib/wmo/types";

export function DailyView({
  trip,
  day,
  isToday,
  liveWeather,
  onOpenDay,
}: {
  trip: Trip;
  day: Day;
  isToday: boolean;
  liveWeather?: LiveWeather;
  onOpenDay: (index: number) => void;
}) {
  const moments = buildDayFeed(day);
  const jumpableTimes = new Set(moments.map((moment) => moment.time));
  const extraDining = untimedDining(day);
  const extraPlaces = untimedPlaces(day);
  const generalTips = dayWideTips(day);

  const jumpToMoment = (time: string) => {
    const target = document.getElementById(momentDomId(day.n, time));
    if (!target) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollIntoView({
      block: "start",
      behavior: reduceMotion ? "auto" : "smooth",
    });
  };

  return (
    <article className="space-y-6">
      <DayHeader
        day={day}
        people={presencesOnDay(trip.partySchedule, day.n)}
        isToday={isToday}
        liveWeather={liveWeather}
      />

      {day.anchors && day.anchors.length > 0 ? (
        <DayGlance
          anchors={day.anchors}
          jumpableTimes={jumpableTimes}
          onJump={jumpToMoment}
        />
      ) : null}

      {generalTips.length > 0 ? (
        <TipsSection tips={generalTips} title="今日须知" />
      ) : null}

      <DayMap day={day} />

      <Section icon={Clock} title="行程">
        <DayFeed tripSlug={trip.slug} day={day} isToday={isToday} />
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

      <StaySection stay={day.stay} onOpenDay={onOpenDay} />
    </article>
  );
}
