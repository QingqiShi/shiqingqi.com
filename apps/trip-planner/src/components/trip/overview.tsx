import {
  BedDouble,
  CalendarDays,
  Car,
  ChevronRight,
  Users,
  Utensils,
} from "lucide-react";
import { DayParty } from "./day-party";
import { Badge } from "@/components/ui/badge";
import type { Day, DayPresence, Trip } from "@/data/types";
import { peopleOnDay } from "@/lib/trip";

function OverviewRow({
  day,
  people,
  isToday,
  onOpen,
}: {
  day: Day;
  people: DayPresence[];
  isToday: boolean;
  onOpen: () => void;
}) {
  const booked = day.restaurants.find((r) => r.status === "booked");

  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group block w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-foreground/30 hover:bg-accent/40"
      >
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-lg bg-muted leading-none">
            <span className="text-[10px] tracking-wide text-muted-foreground">
              DAY
            </span>
            <span className="mt-0.5 text-base font-semibold">{day.n}</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>
                {day.dateLabel} {day.weekday}
              </span>
              {isToday ? <Badge>今天</Badge> : null}
            </div>
            <div className="mt-0.5 truncate font-medium">{day.title}</div>
            <div className="mt-0.5 truncate text-sm text-muted-foreground">
              {day.route}
            </div>
          </div>

          <ChevronRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>

        <DayParty people={people} compact className="mt-3" />

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {day.driving ? (
            <Badge variant="outline">
              <Car />
              {day.driving}
            </Badge>
          ) : null}
          <Badge variant="outline">
            <BedDouble />
            {day.stay.summary}
          </Badge>
          {booked ? (
            <Badge variant="secondary">
              <Utensils />
              已订 · {booked.name}
            </Badge>
          ) : null}
        </div>
      </button>
    </li>
  );
}

export function Overview({
  trip,
  todayIndex,
  onOpenDay,
}: {
  trip: Trip;
  todayIndex: number;
  onOpenDay: (index: number) => void;
}) {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          {trip.title}
        </h1>
        <p className="mt-2 text-muted-foreground text-pretty">
          {trip.subtitle}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline">
            <CalendarDays />
            {trip.dateRange}
          </Badge>
          <Badge variant="outline">
            <Users />
            {trip.party}
          </Badge>
        </div>
      </div>

      <ol className="space-y-3">
        {trip.days.map((day, i) => (
          <OverviewRow
            key={day.n}
            day={day}
            people={peopleOnDay(trip.partySchedule, day.n)}
            isToday={i === todayIndex}
            onOpen={() => {
              onOpenDay(i);
            }}
          />
        ))}
      </ol>
    </div>
  );
}
