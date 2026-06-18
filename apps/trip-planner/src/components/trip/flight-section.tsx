import { Plane, Radar } from "lucide-react";
import type { Flight, FlightEndpoint } from "@/data/types";
import { cn } from "@/lib/utils";

/** One end of the route: airport code, city, and the local time / terminal. */
function Endpoint({
  endpoint,
  align,
}: {
  endpoint: FlightEndpoint;
  align: "left" | "right";
}) {
  const right = align === "right";
  return (
    <div className={cn("flex flex-col", right ? "items-end text-right" : "")}>
      <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
        {endpoint.code}
      </span>
      <span className="mt-1 text-xs text-muted-foreground">
        {endpoint.city}
      </span>
      {endpoint.time || endpoint.terminal ? (
        <span className="mt-2 text-sm font-medium tabular-nums">
          {endpoint.time}
          {endpoint.dayOffset ? (
            <sup className="ml-0.5 text-[10px] font-normal text-muted-foreground">
              +{endpoint.dayOffset}
            </sup>
          ) : null}
          {endpoint.terminal ? (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              {endpoint.terminal}
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

/**
 * A flight as a boarding-pass-style card: airline + flight number up top, the
 * FROM → TO route with local times in the middle, and a 实时追踪 button that
 * opens a live flight tracker. Woven into the day feed at the flight's `time`.
 */
export function FlightCard({ flight }: { flight: Flight }) {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center gap-2.5 border-b bg-muted/40 px-4 py-2.5">
        <Plane className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-semibold tracking-wide">
          {flight.number}
        </span>
        {flight.airline ? (
          <span className="text-xs text-muted-foreground">
            {flight.airline}
          </span>
        ) : null}
        {flight.passenger ? (
          <span className="ml-auto rounded-full bg-foreground px-2 py-0.5 text-[11px] font-medium text-background">
            {flight.passenger}
          </span>
        ) : null}
      </div>

      <div className="flex items-start gap-4 px-4 py-4">
        <Endpoint endpoint={flight.from} align="left" />
        <div
          aria-hidden
          className="flex flex-1 items-center gap-1.5 self-center text-muted-foreground"
        >
          <span className="h-px flex-1 border-t border-dashed border-border" />
          <Plane className="size-4 rotate-45" />
          <span className="h-px flex-1 border-t border-dashed border-border" />
        </div>
        <Endpoint endpoint={flight.to} align="right" />
      </div>

      {flight.track || flight.note ? (
        <div className="relative flex items-center gap-3 border-t border-dashed border-border px-4 py-2.5">
          <span
            aria-hidden
            className="absolute top-0 left-0 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background"
          />
          <span
            aria-hidden
            className="absolute top-0 right-0 size-3 translate-x-1/2 -translate-y-1/2 rounded-full bg-background"
          />
          {flight.note ? (
            <span className="min-w-0 flex-1 text-xs text-pretty text-muted-foreground">
              {flight.note}
            </span>
          ) : (
            <span className="flex-1" />
          )}
          {flight.track ? (
            <a
              href={flight.track}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-3 py-1.5 text-xs font-medium text-background transition-opacity hover:opacity-90"
            >
              <Radar className="size-3.5" />
              实时追踪
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
