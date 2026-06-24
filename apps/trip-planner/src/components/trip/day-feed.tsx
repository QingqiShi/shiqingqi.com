"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChecklistCard } from "./checklist-section";
import { DiningList } from "./dining-section";
import { FlightCard } from "./flight-section";
import { PlacePill } from "./links";
import { NavLegRow } from "./nav-section";
import { SignSheetCard } from "./road-signs";
import { TipRow } from "./tips-section";
import type { Day } from "@/data/types";
import {
  type DayMoment,
  type DropReason,
  buildDayFeed,
  momentDomId,
} from "@/lib/schedule";
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

/** A run of consecutive optional moments the time-budget dropped, or a single
 *  shown moment — the unit the feed lays out top to bottom. */
type FeedRow =
  | { kind: "moment"; moment: DayMoment }
  | {
      kind: "skipped";
      key: string;
      moments: DayMoment[];
      reason: DropReason;
    };

/** Split the day into shown moments and collapsed runs of dropped optionals. A
 *  run reads as "unfit" (no time) if any of its stops were squeezed out ahead;
 *  otherwise it's simply behind the clock ("passed"). */
function toRows(
  moments: DayMoment[],
  dropped: Map<string, DropReason>,
): FeedRow[] {
  const rows: FeedRow[] = [];
  let run: DayMoment[] = [];
  let runHasUnfit = false;
  const flush = () => {
    if (run.length === 0) return;
    rows.push({
      kind: "skipped",
      key: `skip-${run[0].time}`,
      moments: run,
      reason: runHasUnfit ? "unfit" : "passed",
    });
    run = [];
    runHasUnfit = false;
  };
  for (const moment of moments) {
    const reason = dropped.get(moment.time);
    if (reason) {
      run.push(moment);
      if (reason === "unfit") runHasUnfit = true;
      continue;
    }
    flush();
    rows.push({ kind: "moment", moment });
  }
  flush();
  return rows;
}

/**
 * The day as one chronological feed: every timeline moment, with its nav,
 * checklist, dining and place ideas, and heads-up tips gathered around it.
 *
 * On the current day a live time-budget (see {@link planToday}, computed by the
 * parent and passed in as `dropped`) collapses optional stops that no longer fit
 * before the next fixed commitment into a quiet "skipped" toggle, rather than
 * letting them vanish without trace. On phones the feed scrolls to the current
 * time so "now" is in view without hunting.
 */
export function DayFeed({
  tripSlug,
  day,
  dropped,
  nowMinutes,
}: {
  tripSlug: string;
  day: Day;
  dropped: Map<string, DropReason>;
  nowMinutes: number | null;
}) {
  const moments = buildDayFeed(day);
  const rows = toRows(moments, dropped);

  const didInitialScrollRef = useRef(false);
  useEffect(() => {
    if (didInitialScrollRef.current) return;
    if (nowMinutes === null) return;
    didInitialScrollRef.current = true;
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    const shown = moments.filter((moment) => !dropped.has(moment.time));
    if (shown.length === 0) return;

    const index = currentMomentIndex(shown, nowMinutes);
    const target = document.getElementById(
      momentDomId(day.n, shown[index].time),
    );
    target?.scrollIntoView({ block: "start" });
    // moments/dropped are derived from props each render; the ref guard makes
    // this a one-shot, so re-running on their identity change is harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowMinutes, day.n]);

  return (
    <ol>
      {rows.map((row, i) => {
        const isLast = i === rows.length - 1;
        if (row.kind === "skipped") {
          return (
            <SkippedRow
              key={row.key}
              tripSlug={tripSlug}
              dayN={day.n}
              moments={row.moments}
              reason={row.reason}
              isLast={isLast}
            />
          );
        }
        return (
          <MomentRow
            key={row.moment.time}
            tripSlug={tripSlug}
            dayN={day.n}
            moment={row.moment}
            isLast={isLast}
          />
        );
      })}
    </ol>
  );
}

/** A collapsed run of optional stops the day no longer has time for. Tapping it
 *  reveals them, so nothing is lost — you can always see what got dropped. */
function SkippedRow({
  tripSlug,
  dayN,
  moments,
  reason,
  isLast,
}: {
  tripSlug: string;
  dayN: number;
  moments: DayMoment[];
  reason: DropReason;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const labels = moments
    .map((moment) => momentLabel(moment))
    .filter(Boolean)
    .join("、");
  const count = String(moments.length);
  const summary =
    reason === "unfit"
      ? `时间不够，跳过 ${count} 项可选`
      : `已过 ${count} 项可选`;
  const panelId = `${momentDomId(dayN, moments[0].time)}-skipped`;

  return (
    <li className="grid grid-cols-[3.25rem_1fr] gap-x-3">
      <div
        aria-hidden
        className="pt-0.5 text-right text-sm text-muted-foreground/50"
      >
        ··
      </div>
      <div className={cn("border-l border-dashed", isLast ? "pb-1" : "pb-8")}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => {
            setOpen((value) => !value);
          }}
          className="flex items-center gap-1 pl-5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight
            className={cn("size-3.5 transition-transform", open && "rotate-90")}
          />
          <span className="text-pretty">
            {open ? "收起可选" : `${summary}${labels ? `：${labels}` : ""}`}
          </span>
        </button>

        {open ? (
          <ol id={panelId} className="mt-3 space-y-3 opacity-60">
            {moments.map((moment) => (
              <MomentRow
                key={moment.time}
                tripSlug={tripSlug}
                dayN={dayN}
                moment={moment}
                isLast
              />
            ))}
          </ol>
        ) : null}
      </div>
    </li>
  );
}

/** A short name for a dropped moment, for the "skipped" summary line. */
function momentLabel(moment: DayMoment): string {
  if (moment.places.length > 0) return moment.places[0].name;
  if (moment.dining.length > 0) return moment.dining[0].name;
  if (moment.events.length > 0) return moment.events[0].text.slice(0, 12);
  if (moment.nav.length > 0) return moment.nav[0].label;
  return "";
}

/** One shown moment in the feed. */
function MomentRow({
  tripSlug,
  dayN,
  moment,
  isLast,
}: {
  tripSlug: string;
  dayN: number;
  moment: DayMoment;
  isLast: boolean;
}) {
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
        <span
          className={cn(
            "absolute top-1.5 -left-[5px] size-2.5 rounded-full ring-4 ring-background",
            moment.optional
              ? "border border-foreground bg-background"
              : "bg-foreground",
          )}
        />

        {moment.optional ? (
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            可选 · 有时间再去
          </p>
        ) : null}

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
