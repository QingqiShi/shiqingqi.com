import type { LucideIcon } from "lucide-react";
import {
  House,
  PlaneLanding,
  PlaneTakeoff,
  UserRoundMinus,
  UserRoundPlus,
} from "lucide-react";
import type { DayPresence, PresenceKind, TravelVia } from "@/data/types";
import { cn } from "@/lib/utils";

type Transition = Exclude<PresenceKind, "present">;

const transitionVerb: Record<Transition, string> = {
  arrive: "抵达",
  depart: "离开",
  home: "回家",
};

/** Pictograph per transition × travel mode. Flights use planes (大雨 / Jim);
 *  ground arrivals use person glyphs (Ed drives over); 石头 heading home uses a
 *  house. Keyed `${kind}-${via}` so the lookup stays a static map. */
const transitionIcon: Record<`${Transition}-${TravelVia}`, LucideIcon> = {
  "arrive-air": PlaneLanding,
  "arrive-ground": UserRoundPlus,
  "depart-air": PlaneTakeoff,
  "depart-ground": UserRoundMinus,
  "home-air": House,
  "home-ground": House,
};

/**
 * One person as an avatar medallion: their initial inside, the day's
 * transition stamped as a corner badge. People merely around read quiet;
 * anyone arriving, leaving, or heading home is inverted so the day's comings
 * and goings pop out of the row.
 */
function PersonToken({
  person,
  compact,
  index,
}: {
  person: DayPresence;
  compact: boolean;
  index: number;
}) {
  const transition = person.kind === "present" ? null : person.kind;
  const Icon = transition
    ? transitionIcon[`${transition}-${person.via}`]
    : null;
  const verb = transition ? transitionVerb[transition] : "同行";

  return (
    <li
      className={cn(
        "flex flex-col items-center gap-1.5",
        // Staggered reveal only in the focal daily header, never in the dense
        // overview list. Reduced-motion users get the resting (visible) state.
        !compact &&
          "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-90 motion-safe:fill-mode-both",
      )}
      style={
        compact ? undefined : { animationDelay: `${String(index * 70)}ms` }
      }
    >
      <span
        role="img"
        aria-label={`${person.name} ${verb}`}
        className="relative transition-transform duration-200 ease-out hover:-translate-y-0.5"
      >
        <span
          aria-hidden
          className={cn(
            "grid place-items-center rounded-full font-semibold leading-none select-none",
            compact ? "size-7 text-xs" : "size-9 text-sm",
            transition
              ? "bg-foreground text-background shadow-sm"
              : "bg-muted text-foreground/75 ring-1 ring-border ring-inset",
          )}
        >
          {person.initial}
        </span>
        {Icon ? (
          <span
            aria-hidden
            className={cn(
              "absolute -right-1 -bottom-1 grid place-items-center rounded-full bg-background text-foreground shadow-sm ring-2 ring-background",
              compact ? "size-4" : "size-[18px]",
            )}
          >
            <Icon className={compact ? "size-2.5" : "size-3"} />
          </span>
        ) : null}
      </span>
      {compact ? null : (
        <span
          aria-hidden
          className={cn(
            "max-w-16 truncate text-[11px] leading-none",
            transition
              ? "font-medium text-foreground"
              : "text-muted-foreground",
          )}
        >
          {person.name}
        </span>
      )}
    </li>
  );
}

/** The day's "who's involved" cast: an avatar per person, with arrivals and
 *  departures pictographed as corner badges. `compact` drops names and motion
 *  for dense lists (the overview). */
export function DayParty({
  people,
  className,
  compact = false,
}: {
  people: DayPresence[];
  className?: string;
  compact?: boolean;
}) {
  if (people.length === 0) return null;

  return (
    <ul
      className={cn(
        "flex flex-wrap items-start",
        compact ? "gap-2.5" : "gap-3",
        className,
      )}
    >
      {people.map((person, index) => (
        <PersonToken
          key={person.id}
          person={person}
          compact={compact}
          index={index}
        />
      ))}
    </ul>
  );
}
