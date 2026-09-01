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
import type { Tip, TipKind } from "@/data/types";

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
