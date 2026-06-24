"use client";

import { Fragment, type ReactNode, useEffect, useRef } from "react";
import { ChecklistCard } from "./checklist-section";
import { DiningList } from "./dining-section";
import { FlightCard } from "./flight-section";
import { PlacePill } from "./links";
import { NavLegRow } from "./nav-section";
import { SignSheetCard } from "./road-signs";
import { TipRow } from "./tips-section";
import { type PlannedMoment, momentDomId } from "@/lib/schedule";
import { cn } from "@/lib/utils";

// Only nudge the scroll on phones; on wider screens the day mostly fits.
const MOBILE_QUERY = "(max-width: 767px)";

/** Index of the visible row that's "now" — the last one already started, or -1
 *  when the whole day still lies ahead. */
function currentRowIndex(rows: PlannedMoment[], nowMinutes: number) {
  let index = -1;
  for (const [i, row] of rows.entries()) {
    if (row.moment.minutes <= nowMinutes) index = i;
  }
  return index;
}

/**
 * The day as one chronological feed: every timeline moment, with its nav,
 * checklist, dining and place ideas, and heads-up tips gathered around it.
 *
 * `rows` arrives already pruned by the parent — on the current day the user's
 * dropped optional stops are gone and the drive re-stitched around them. The
 * `planner` control, when given, is woven in at "now" so adjusting the rest of
 * the day is one tap away. On phones the feed scrolls to the current time so
 * "now" is in view without hunting.
 */
export function DayFeed({
  tripSlug,
  dayN,
  rows,
  nowMinutes,
  planner,
}: {
  tripSlug: string;
  dayN: number;
  rows: PlannedMoment[];
  nowMinutes: number | null;
  planner?: ReactNode;
}) {
  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (nowMinutes === null || rows.length === 0) return;
    didInitialScrollRef.current = true;
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    const index = Math.max(0, currentRowIndex(rows, nowMinutes));
    const target = document.getElementById(
      momentDomId(dayN, rows[index].moment.time),
    );
    target?.scrollIntoView({ block: "start" });
    // `nowMinutes` arrives null then resolves on the client, so it must be a
    // dependency for the scroll to fire once it's known; the ref guard keeps
    // this a one-shot despite rows/nowMinutes changing identity each render.
  }, [rows, nowMinutes, dayN]);

  // Weave the planner in right after the current moment (or at the very top
  // when the day still lies ahead). It only renders on the current day.
  const lastIndex = rows.length - 1;
  const plannerAfter =
    planner && nowMinutes !== null ? currentRowIndex(rows, nowMinutes) : null;
  const plannerIsLast =
    plannerAfter !== null && (rows.length === 0 || plannerAfter === lastIndex);

  return (
    <ol>
      {plannerAfter === -1 ? (
        <PlannerRow isLast={plannerIsLast}>{planner}</PlannerRow>
      ) : null}
      {rows.map((row, i) => (
        <Fragment key={row.moment.time}>
          <MomentRow
            tripSlug={tripSlug}
            dayN={dayN}
            row={row}
            isLast={i === lastIndex && !plannerIsLast}
          />
          {plannerAfter === i && i !== -1 ? (
            <PlannerRow isLast={plannerIsLast}>{planner}</PlannerRow>
          ) : null}
        </Fragment>
      ))}
    </ol>
  );
}

/** The "now" row that carries the planner control, marked with a hollow node. */
function PlannerRow({
  isLast,
  children,
}: {
  isLast: boolean;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[3.25rem_1fr] gap-x-3">
      <div className="pt-1 text-right text-xs font-medium text-muted-foreground">
        现在
      </div>
      <div
        className={cn(
          "relative border-l pl-5",
          isLast ? "border-l-transparent pb-1" : "pb-8",
        )}
      >
        <span className="absolute top-1.5 -left-[6px] size-3 rounded-full border-2 border-foreground bg-background ring-4 ring-background" />
        {children}
      </div>
    </li>
  );
}

/** One shown moment in the feed. */
function MomentRow({
  tripSlug,
  dayN,
  row,
  isLast,
}: {
  tripSlug: string;
  dayN: number;
  row: PlannedMoment;
  isLast: boolean;
}) {
  const { moment } = row;
  const hasExtras =
    moment.flights.length > 0 ||
    moment.checklists.length > 0 ||
    moment.signSheets.length > 0 ||
    moment.nav.length > 0 ||
    moment.dining.length > 0 ||
    moment.places.length > 0 ||
    moment.tips.length > 0;

  return (
    <li
      id={momentDomId(dayN, moment.time)}
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
          <div className={cn("space-y-3", moment.events.length > 0 && "mt-3")}>
            {moment.flights.map((flight) => (
              <FlightCard key={flight.number} flight={flight} />
            ))}

            {moment.checklists.map((list) => (
              <ChecklistCard
                key={list.title}
                tripSlug={tripSlug}
                dayN={dayN}
                list={list}
              />
            ))}

            {moment.signSheets.map((sheet) => (
              <SignSheetCard key={sheet.title} sheet={sheet} />
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
}
