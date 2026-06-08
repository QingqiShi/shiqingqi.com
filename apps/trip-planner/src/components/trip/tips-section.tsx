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

/** One heads-up: kind icon + text. Reused inline in a feed moment. */
export function TipRow({ tip }: { tip: Tip }) {
  const Icon = tipIcon[tip.kind];
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <span className="text-pretty">{tip.text}</span>
    </li>
  );
}

/** Practical heads-ups for the day (parking, fuel, driving rules, transit). */
export function TipsSection({
  tips,
  title = "实用提示",
}: {
  tips: Tip[];
  title?: string;
}) {
  return (
    <Section icon={Info} title={title}>
      <ul className="space-y-2.5">
        {tips.map((tip) => (
          <TipRow key={tip.text} tip={tip} />
        ))}
      </ul>
    </Section>
  );
}
