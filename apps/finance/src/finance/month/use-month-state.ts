import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useStateInUrl } from "../navigation/use-state-in-url.ts";
import {
  resolveMonth,
  type MonthBounds,
  type MonthKey,
} from "./month-bounds.ts";

/**
 * The month the Month screen shows and the day picked in it. React state
 * leads, so a new month draws at once, and the URL follows in place.
 */
export function useMonthState(bounds: MonthBounds) {
  const searchParams = useSearchParams();
  const [asked, setAsked] = useStateInUrl<string | null>(
    () => searchParams.get("month"),
    (next) => ({
      screen: "month",
      month: next === bounds.last ? null : next,
    }),
  );
  const [pickedDay, setPickedDay] = useState<number | null>(null);
  const month = resolveMonth(asked, bounds);

  const setMonth = (next: MonthKey) => {
    if (next === month) return;
    setAsked(next);
    setPickedDay(null);
  };

  return { month, setMonth, pickedDay, setPickedDay };
}
