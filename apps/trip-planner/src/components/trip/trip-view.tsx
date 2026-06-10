"use client";

import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { DailyView } from "./daily-view";
import { Overview } from "./overview";
import type { Day, Trip, TripPhase } from "@/data/types";
import { cn } from "@/lib/utils";
import type { LiveWeather } from "@/lib/wmo";

type View = "daily" | "overview";

const VIEWS: { value: View; label: string }[] = [
  { value: "daily", label: "每日" },
  { value: "overview", label: "总览" },
];

function ViewSwitch({
  value,
  onChange,
}: {
  value: View;
  onChange: (value: View) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border bg-muted/50 p-0.5 text-sm">
      {VIEWS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => {
            onChange(option.value);
          }}
          className={cn(
            "rounded-md px-3 py-1 transition-colors",
            value === option.value
              ? "bg-background font-medium shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function DaySelector({
  days,
  selected,
  todayIndex,
  onSelect,
}: {
  days: Day[];
  selected: number;
  todayIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="mx-auto max-w-3xl overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
      <div className="flex gap-1.5">
        {days.map((day, i) => {
          const [, month, date] = day.date.split("-");
          const isSelected = i === selected;
          return (
            <button
              key={day.n}
              type="button"
              onClick={() => {
                onSelect(i);
              }}
              className={cn(
                "flex min-w-[3.25rem] shrink-0 flex-col items-center rounded-lg border px-2.5 py-1.5 transition-colors",
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "bg-card hover:bg-accent",
              )}
            >
              <span className="text-[11px] font-medium">D{day.n}</span>
              <span
                className={cn(
                  "text-[11px] tabular-nums",
                  !isSelected && "text-muted-foreground",
                )}
              >
                {Number(month)}.{Number(date)}
              </span>
              <span
                className={cn(
                  "mt-1 size-1 rounded-full",
                  i === todayIndex
                    ? isSelected
                      ? "bg-background"
                      : "bg-foreground"
                    : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PhaseBanner({
  phase,
  daysUntil,
  startLabel,
}: {
  phase: TripPhase;
  daysUntil: number;
  startLabel: string;
}) {
  if (phase === "during") return null;
  const text =
    phase === "before"
      ? `距出发还有 ${String(daysUntil)} 天 · ${startLabel}启程`
      : "旅程已结束 · 回顾全程";
  return (
    <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 pt-4 text-sm text-muted-foreground">
      <CalendarClock className="size-4 shrink-0" />
      {text}
    </div>
  );
}

export function TripView({
  trip,
  currentDayIndex,
  phase,
  daysUntil,
  weatherByDay,
}: {
  trip: Trip;
  currentDayIndex: number;
  phase: TripPhase;
  daysUntil: number;
  weatherByDay: Record<number, LiveWeather>;
}) {
  const [view, setView] = useState<View>("daily");
  const [dayIndex, setDayIndex] = useState(currentDayIndex);

  const todayIndex = phase === "during" ? currentDayIndex : -1;

  const openDay = (index: number) => {
    setDayIndex(index);
    setView("daily");
    window.scrollTo({ top: 0 });
  };

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between gap-4 px-4">
          <span className="truncate text-sm font-semibold">{trip.title}</span>
          <ViewSwitch value={view} onChange={setView} />
        </div>
        {view === "daily" ? (
          <DaySelector
            days={trip.days}
            selected={dayIndex}
            todayIndex={todayIndex}
            onSelect={setDayIndex}
          />
        ) : null}
      </header>

      <PhaseBanner
        phase={phase}
        daysUntil={daysUntil}
        startLabel={trip.days[0].dateLabel}
      />

      <main className="mx-auto max-w-3xl px-4 py-8">
        {view === "daily" ? (
          <DailyView
            trip={trip}
            day={trip.days[dayIndex]}
            isToday={dayIndex === todayIndex}
            liveWeather={weatherByDay[trip.days[dayIndex].n]}
            onOpenDay={openDay}
          />
        ) : (
          <Overview trip={trip} todayIndex={todayIndex} onOpenDay={openDay} />
        )}
      </main>

      <footer className="mx-auto max-w-3xl px-4 pt-4 pb-10 text-center text-xs text-muted-foreground">
        祝旅途愉快，一路平安 · 行程仅供参考，餐厅与价格以官网实时为准
      </footer>
    </div>
  );
}
