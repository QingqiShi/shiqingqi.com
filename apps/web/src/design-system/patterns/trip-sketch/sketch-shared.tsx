"use client";

import { BedIcon } from "@phosphor-icons/react/dist/ssr/Bed";
import { CarIcon } from "@phosphor-icons/react/dist/ssr/Car";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { MapPinIcon } from "@phosphor-icons/react/dist/ssr/MapPin";
import { SuitcaseRollingIcon } from "@phosphor-icons/react/dist/ssr/SuitcaseRolling";
import { Callout } from "@tuja/ui/components/callout";
import { ListRow } from "@tuja/ui/components/list-row";
import { TabViewBrand } from "@tuja/ui/components/tab-view-brand";
import type { ReactNode } from "react";
import trip from "./sketch-trip.json";

export interface SketchItem {
  id: string;
  type: string;
  label?: string;
  name?: string;
  note?: string;
  text?: string;
  kind?: string;
}

export interface SketchMoment {
  id: string;
  time: string;
  text?: string;
  items: SketchItem[];
}

export interface SketchDay {
  id: string;
  date: string;
  title: string;
  route?: string;
  driving?: string;
  weather?: { temp: string; summary: string };
  moments: SketchMoment[];
  tips: { id: string; kind: string; text: string }[];
  stay: { summary: string; note?: string };
}

export const sketchTrip = trip as {
  title: string;
  subtitle: string;
  party: string;
  days: SketchDay[];
};

export const CURRENT_DAY = 3;

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];

export function dayDate(day: SketchDay) {
  const date = new Date(`${day.date}T00:00:00Z`);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

const TIME_WORDS: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  allDay: "All day",
  backup: "Backup",
};

export function timeLabel(time: string) {
  return TIME_WORDS[time] ?? time;
}

const TIP_INTENTS: Record<string, "warning" | "info" | "neutral"> = {
  warn: "warning",
  info: "info",
  money: "neutral",
};

export function TipCallout({ tip }: { tip: { kind?: string; text?: string } }) {
  return (
    <Callout intent={TIP_INTENTS[tip.kind ?? "info"] ?? "info"}>
      {tip.text}
    </Callout>
  );
}

/** The rows of a moment's items that are places or routes. */
export function itemRows(items: SketchItem[]): ReactNode[] {
  return items
    .filter((item) => item.type === "nav" || item.type === "place")
    .map((item) => (
      <ListRow
        key={item.id}
        href={`#${item.id}`}
        leading={
          item.type === "nav" ? (
            <CarIcon weight="bold" />
          ) : (
            <MapPinIcon weight="bold" />
          )
        }
        leadingShape="circle"
        detail={item.note}
      >
        {item.label ?? item.name}
      </ListRow>
    ));
}

export function momentTips(items: SketchItem[]) {
  return items.filter((item) => item.type === "tip");
}

export const stayIcon = <BedIcon weight="bold" />;

export const sketchDestinations = [
  { href: "#trips", label: "Trips", icon: SuitcaseRollingIcon, current: true },
  { href: "#settings", label: "Settings", icon: GearSixIcon },
];

export const sketchBrand = (
  <TabViewBrand name="Trips" initials="Qi" detail="qingqi.dev" />
);

export const SKETCH_TRIPS = [
  {
    id: "tuscany",
    title: "托斯卡纳自驾",
    dates: "11–15 Jun",
    current: true,
    badge: "Day 3",
  },
  { id: "gb", title: "大不列颠自驾", dates: "18–30 Jun", badge: "Day 4" },
  { id: "kyoto", title: "Kyoto in autumn", dates: "Draft" },
];
