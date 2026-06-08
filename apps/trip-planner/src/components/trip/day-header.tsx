import { Car, CloudSun, Route } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Day } from "@/data/itinerary";

export function DayHeader({ day, isToday }: { day: Day; isToday: boolean }) {
  return (
    <header>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Day {day.n}</span>
        <span>·</span>
        <span>{day.dateLabel}</span>
        <span>{day.weekday}</span>
        {isToday ? <Badge className="ml-1">今天</Badge> : null}
      </div>

      <h2 className="mt-1 text-2xl font-semibold tracking-tight text-balance">
        {day.title}
      </h2>

      <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Route className="size-4 shrink-0" />
        {day.route}
      </p>

      {day.driving || day.weather ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {day.driving ? (
            <Badge variant="outline">
              <Car />
              {day.driving}
            </Badge>
          ) : null}
          {day.weather ? (
            <Badge variant="outline">
              <CloudSun />
              {day.weather.temp} · {day.weather.summary}
            </Badge>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
