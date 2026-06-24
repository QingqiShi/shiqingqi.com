"use client";

import { Clock, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { DayFeed } from "./day-feed";
import { DayGlance } from "./day-glance";
import { DayHeader } from "./day-header";
import { DayMap } from "./day-map";
import { DiningList } from "./dining-section";
import { PlaceList } from "./places-section";
import { Section } from "./section";
import { StaySection } from "./stay-section";
import { TipsSection } from "./tips-section";
import type { Day, Trip } from "@/data/types";
import {
  type DropReason,
  buildDayFeed,
  dayWideTips,
  momentDomId,
  planToday,
  untimedDining,
  untimedPlaces,
} from "@/lib/schedule";
import { peopleOnDay } from "@/lib/trip";
import type { LiveWeather } from "@/lib/wmo";

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

  // The live clock that drives the today-only time-budget. One source of truth,
  // read on the client so it's the user's real "now" — shared by the feed (what
  // to collapse) and the glance card (which jumps still land somewhere).
  const [nowMinutes, setNowMinutes] = useState<number | null>(null);
  useEffect(() => {
    if (!isToday) return;
    const tick = () => {
      const now = new Date();
      setNowMinutes(now.getHours() * 60 + now.getMinutes());
    };
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => {
      window.clearInterval(id);
    };
  }, [isToday]);

  const dropped =
    isToday && nowMinutes !== null
      ? planToday(moments, nowMinutes)
      : new Map<string, DropReason>();

  // Only offer to jump to moments that are actually rendered — a dropped
  // optional has no element to scroll to, so it must not look tappable.
  const jumpableTimes = new Set(
    moments
      .filter((moment) => !dropped.has(moment.time))
      .map((moment) => moment.time),
  );
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
        people={peopleOnDay(trip.partySchedule, day.n)}
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
        <DayFeed
          tripSlug={trip.slug}
          day={day}
          dropped={dropped}
          nowMinutes={nowMinutes}
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

      <StaySection stay={day.stay} onOpenDay={onOpenDay} />
    </article>
  );
}
