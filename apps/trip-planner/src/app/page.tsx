import { CalendarDays, ChevronRight, Lock, Users } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { trips } from "@/data/trips";
import type { Trip } from "@/data/types";
import { resolveDay } from "@/lib/trip";

// "Where is each trip relative to today" depends on the wall clock, so render
// per-request.
export const dynamic = "force-dynamic";

function phaseBadge(trip: Trip, now: Date) {
  const { index, phase, daysUntil } = resolveDay(now, trip.days);
  switch (phase) {
    case "before":
      return <Badge>{`还有 ${String(daysUntil)} 天出发`}</Badge>;
    case "during":
      return <Badge>{`进行中 · Day ${String(trip.days[index].n)}`}</Badge>;
    case "after":
      return <Badge variant="secondary">已结束</Badge>;
  }
}

function TripCard({ trip, now }: { trip: Trip; now: Date }) {
  return (
    <li>
      <Link
        href={`/${trip.slug}`}
        className="group block rounded-xl border bg-card p-5 transition-colors hover:border-foreground/30 hover:bg-accent/40"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {trip.title}
              </h2>
              {phaseBadge(trip, now)}
            </div>
            <p className="mt-1 text-sm text-muted-foreground text-pretty">
              {trip.subtitle}
            </p>
          </div>
          <ChevronRight className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
        </div>

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
      </Link>
    </li>
  );
}

export default function HomePage() {
  // Per-request server component (force-dynamic): request time is the intended "now".
  // eslint-disable-next-line @eslint-react/purity
  const now = new Date();

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">旅行计划</h1>
        <p className="mt-2 text-muted-foreground">选择一个行程查看每日安排</p>
      </header>

      <main className="flex-1">
        <ol className="space-y-3">
          {trips.map((trip) => (
            <TripCard key={trip.slug} trip={trip} now={now} />
          ))}
        </ol>
      </main>

      <footer className="flex items-center justify-center gap-1.5 pt-10 pb-2 text-center text-xs text-muted-foreground">
        <Lock className="size-3" />
        每个行程有各自的密码，首次打开时输入一次即可
      </footer>
    </div>
  );
}
