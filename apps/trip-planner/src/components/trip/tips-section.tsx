import type { LucideIcon } from "lucide-react";
import {
  Banknote,
  Car,
  Fuel,
  Info,
  ParkingCircle,
  TrainFront,
  TriangleAlert,
} from "lucide-react";
import { Section } from "./section";
import type { Tip, TipKind } from "@/data/itinerary";

const tipIcon: Record<TipKind, LucideIcon> = {
  parking: ParkingCircle,
  fuel: Fuel,
  drive: Car,
  transit: TrainFront,
  money: Banknote,
  warn: TriangleAlert,
  info: Info,
};

/** Practical heads-ups for the day (parking, fuel, driving rules, transit). */
export function TipsSection({ tips }: { tips: Tip[] }) {
  return (
    <Section icon={Info} title="实用提示">
      <ul className="space-y-2.5">
        {tips.map((tip) => {
          const Icon = tipIcon[tip.kind];
          return (
            <li
              key={tip.text}
              className="flex items-start gap-2.5 text-sm leading-relaxed"
            >
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <span className="text-pretty">{tip.text}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
