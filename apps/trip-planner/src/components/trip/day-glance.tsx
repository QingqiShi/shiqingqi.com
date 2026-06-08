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
import { NavLink } from "./links";
import type { Anchor, AnchorKind } from "@/data/itinerary";

const anchorIcon: Record<AnchorKind, LucideIcon> = {
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
  anchors,
  jumpableTimes,
  onJump,
}: {
  anchors: Anchor[];
  jumpableTimes?: Set<string>;
  onJump?: (time: string) => void;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4 shadow-sm">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Sparkles className="size-4" />
        今日要点
      </h3>
      <ul className="space-y-3">
        {anchors.map((anchor) => {
          const Icon = anchorIcon[anchor.kind];
          const time = anchor.time;
          const canJump = Boolean(onJump && time && jumpableTimes?.has(time));
          return (
            <li key={anchor.label} className="flex items-center gap-3">
              <span className="w-12 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
                {anchor.time}
              </span>
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              {canJump && time ? (
                <button
                  type="button"
                  onClick={() => {
                    onJump?.(time);
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
