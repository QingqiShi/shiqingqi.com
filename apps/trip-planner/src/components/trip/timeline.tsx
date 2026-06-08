import type { TimelineItem } from "@/data/itinerary";

/** A vertical schedule: time on the left, a connecting rail, then the text. */
export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol>
      {items.map((item) => (
        <li key={item.time} className="grid grid-cols-[3rem_1fr] gap-x-3">
          <div className="pt-px text-right text-sm tabular-nums text-muted-foreground">
            {item.time}
          </div>
          <div className="relative border-l pb-5 pl-4 last:border-l-transparent last:pb-0">
            <span className="absolute top-1.5 -left-[3.5px] size-1.5 rounded-full bg-foreground/40 ring-2 ring-background" />
            <p className="text-sm leading-relaxed">{item.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
