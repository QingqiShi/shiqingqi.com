import type { Day, Restaurant } from "@/data/types";

/** Dining options not pinned to a meal slot — a safety net so none vanish. */
export function untimedDining(day: Day): Restaurant[] {
  return day.restaurants.filter((restaurant) => !restaurant.time);
}
