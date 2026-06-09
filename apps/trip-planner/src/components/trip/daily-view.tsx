"use client";

import { Clock, MapPin } from "lucide-react";
import { DayFeed } from "./day-feed";
import { DayGlance } from "./day-glance";
import { DayHeader } from "./day-header";
import { DayMap } from "./day-map";
import { DiningList } from "./dining-section";
import { PlacePill } from "./links";
import { Section } from "./section";
import { StaySection } from "./stay-section";
import { TipsSection } from "./tips-section";
import type { Day } from "@/data/itinerary";
import {
  buildDayFeed,
  dayWideTips,
  momentDomId,
  untimedDining,
  untimedPlaces,
} from "@/lib/schedule";
import type { LiveWeather } from "@/lib/wmo";

export function DailyView({
  day,
  isToday,
  liveWeather,
  onOpenDay,
}: {
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
      <DayHeader day={day} isToday={isToday} liveWeather={liveWeather} />

      {day.anchors && day.anchors.length > 0 ? (
        <DayGlance
          anchors={day.anchors}
          jumpableTimes={jumpableTimes}
          onJump={jumpToMoment}
        />
      ) : null}

      <DayMap day={day} />

      <Section icon={Clock} title="行程">
        <DayFeed day={day} isToday={isToday} />
      </Section>

      {extraDining.length > 0 ? (
        <Section icon={MapPin} title="餐饮选择">
          <DiningList restaurants={extraDining} />
        </Section>
      ) : null}

      {extraPlaces.length > 0 ? (
        <Section icon={MapPin} title="想去的地方">
          <div className="flex flex-wrap gap-2">
            {extraPlaces.map((place) => (
              <PlacePill key={place.name} place={place} />
            ))}
          </div>
        </Section>
      ) : null}

      {generalTips.length > 0 ? (
        <TipsSection tips={generalTips} title="今日须知" />
      ) : null}

      <StaySection stay={day.stay} onOpenDay={onOpenDay} />
    </article>
  );
}
