import type { Bucket } from "./types.ts";

export type Mood = "sleep" | "party" | "worry" | "happy";

type MoodInput = {
  five: number | null;
  week: number | null;
  isOverForecast: boolean;
  isCelebrating: boolean;
};

export function moodOf(input: MoodInput): Mood {
  if (input.five !== null && input.five >= 100) return "sleep";
  if (input.isCelebrating) return "party";
  const isTight =
    input.isOverForecast ||
    (input.five !== null && input.five >= 85) ||
    (input.week !== null && input.week >= 90);
  if (isTight) return "worry";

  return "happy";
}

export function bucketsFor(
  mood: Mood,
  hour: number,
  streak: number,
  extra: { isLevelUp: boolean; lost: number | null },
): Bucket[] {
  if (mood === "party" && extra.isLevelUp) return ["levelup"];
  if (mood !== "happy") return [mood];
  if (hour < 5) return ["night"];
  if (extra.lost !== null) return ["broken"];
  if (streak >= 7) return ["happy", "streak"];

  return ["happy"];
}
