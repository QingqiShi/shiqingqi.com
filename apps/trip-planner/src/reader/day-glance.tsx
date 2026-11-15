import type { LucideIcon } from "lucide-react";
import {
  BedDouble,
  Car,
  LogOut,
  Plane,
  Sparkles,
  TrainFront,
  UserRoundMinus,
  UserRoundPlus,
  Utensils,
} from "lucide-react";
import type { DayHighlight } from "./day-highlights";
import { NavLink } from "@/reader/maps/nav-link";
import type { HighlightKind } from "@/trips/types";

const anchorIcon: Record<HighlightKind, LucideIcon> = {
  flight: Plane,
  pickup: UserRoundPlus,
  dropoff: UserRoundMinus,
  checkin: BedDouble,
  checkout: LogOut,
  reservation: Utensils,
  transit: TrainFront,
  drive: Car,
};

/** The at-a-glance card: the day's fixed "must-be-there" moments. Tapping a row
 *  jumps to that moment in the feed below; the 导航 button opens maps. Answers
 *  "where do I have to be". */
export function DayGlance({
  highlights,
  onJump,
}: {
  highlights: DayHighlight[];
  onJump?: (momentId: string) => void;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="size-4" />
        今日要点
      </h3>
      <ul className="space-y-3">
        {highlights.map((anchor) => {
          const Icon = anchorIcon[anchor.kind];
          const canJump = Boolean(onJump && anchor.inFeed);
          return (
            <li key={anchor.momentId} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                {anchor.time}
              </span>
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              {canJump ? (
                <button
                  type="button"
                  onClick={() => {
                    onJump?.(anchor.momentId);
                  }}
                  className="min-w-0 flex-1 text-left text-sm font-medium text-pretty underline-offset-4 transition-colors hover:text-muted-foreground hover:underline"
                >
                  {anchor.label}
                </button>
              ) : (
                <span className="min-w-0 flex-1 text-sm font-medium text-pretty">
                  {anchor.label}
                </span>
              )}
              {anchor.query ? (
                <NavLink to={anchor.query} mode={anchor.mode} />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
