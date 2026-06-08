"use client";

import { useEffect, useRef } from "react";
import { ChecklistCard } from "./checklist-section";
import { DiningList } from "./dining-section";
import { PlacePill } from "./links";
import { NavLegRow } from "./nav-section";
import { TipRow } from "./tips-section";
import type { Day } from "@/data/itinerary";
import { type DayMoment, buildDayFeed, momentDomId } from "@/lib/schedule";
import { cn } from "@/lib/utils";

// Only nudge the scroll on phones; on wider screens the day mostly fits.
const MOBILE_QUERY = "(max-width: 767px)";

/** Index of the moment that's "now" — the last one already started. */
function currentMomentIndex(moments: DayMoment[], nowMinutes: number) {
  let index = 0;
  for (const [i, moment] of moments.entries()) {
    if (moment.minutes <= nowMinutes) index = i;
  }
  return index;
}

/**
 * The day as one chronological feed: every timeline moment, with its nav,
 * checklist, dining and place ideas, and heads-up tips gathered around it.
 * On phones, the initially-loaded day scrolls to the current time so "now" is
 * in view without hunting.
 */
export function DayFeed({ day, isToday }: { day: Day; isToday: boolean }) {
  const moments = buildDayFeed(day);
  const didInitialScrollRef = useRef(false);

  useEffect(() => {
    if (didInitialScrollRef.current) return;
    didInitialScrollRef.current = true;
    if (!isToday || moments.length === 0) return;
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const index = currentMomentIndex(moments, nowMinutes);
    const target = document.getElementById(
      momentDomId(day.n, moments[index].time),
    );
    target?.scrollIntoView({ block: "start" });
  }, [moments, isToday, day.n]);

  return (
    <ol>
      {moments.map((moment, i) => {
        const isLast = i === moments.length - 1;
        const hasExtras =
          moment.checklists.length > 0 ||
          moment.nav.length > 0 ||
          moment.dining.length > 0 ||
          moment.places.length > 0 ||
          moment.tips.length > 0;

        return (
          <li
            key={moment.time}
            id={momentDomId(day.n, moment.time)}
            className="grid scroll-mt-32 grid-cols-[3.25rem_1fr] gap-x-3"
          >
            <div className="pt-0.5 text-right text-sm tabular-nums text-muted-foreground">
              {moment.time}
            </div>

            <div
              className={cn(
                "relative border-l pl-5",
                isLast ? "border-l-transparent pb-1" : "pb-8",
              )}
            >
              <span className="absolute top-1.5 -left-[5px] size-2.5 rounded-full bg-foreground ring-4 ring-background" />

              {moment.events.map((event) => (
                <p
                  key={event.text}
                  className="text-[15px] leading-snug font-medium text-pretty"
                >
                  {event.text}
                </p>
              ))}

              {hasExtras ? (
                <div
                  className={cn(
                    "space-y-3",
                    moment.events.length > 0 && "mt-3",
                  )}
                >
                  {moment.checklists.map((list) => (
                    <ChecklistCard key={list.title} dayN={day.n} list={list} />
                  ))}

                  {moment.nav.length > 0 ? (
                    <ul className="space-y-2">
                      {moment.nav.map((leg) => (
                        <NavLegRow key={leg.label} leg={leg} />
                      ))}
                    </ul>
                  ) : null}

                  {moment.dining.length > 0 ? (
                    <DiningList restaurants={moment.dining} />
                  ) : null}

                  {moment.places.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {moment.places.map((place) => (
                        <PlacePill key={place.name} place={place} />
                      ))}
                    </div>
                  ) : null}

                  {moment.tips.length > 0 ? (
                    <ul className="space-y-2.5">
                      {moment.tips.map((tip) => (
                        <TipRow key={tip.text} tip={tip} />
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
