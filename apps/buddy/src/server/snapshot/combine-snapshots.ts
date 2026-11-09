import type { PetDay, PublicPetState } from "#src/pet/types.ts";
import type { MacSnapshot } from "./parse-snapshot.ts";

/**
 * Each day summed over every machine that has it. An optional count is summed
 * only when every machine that has the day reports it: a part sum would look
 * like a drop.
 */
export function sumDays(machines: readonly (readonly PetDay[])[]): PetDay[] {
  const byDay = new Map<string, PetDay[]>();
  for (const days of machines) {
    for (const day of days) {
      const list = byDay.get(day.day);
      if (list) list.push(day);
      else byDay.set(day.day, [day]);
    }
  }
  const sumOf = (days: PetDay[], key: "cacheRead" | "promptTokens") =>
    days.every((day) => day[key] !== undefined)
      ? days.reduce((sum, day) => sum + (day[key] ?? 0), 0)
      : undefined;
  return [...byDay.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([day, days]) => {
      const cacheRead = sumOf(days, "cacheRead");
      const promptTokens = sumOf(days, "promptTokens");
      return {
        day,
        tokens: days.reduce((sum, d) => sum + d.tokens, 0),
        costUsd: days.reduce((sum, d) => sum + d.costUsd, 0),
        ...(cacheRead === undefined ? {} : { cacheRead }),
        ...(promptTokens === undefined ? {} : { promptTokens }),
      };
    });
}

/** The value of the Mac that saw it last. A Mac without a value has no say. */
function newest<T>(
  snapshots: readonly MacSnapshot[],
  valueOf: (snapshot: MacSnapshot) => T | null,
  seenAt: (value: T, snapshot: MacSnapshot) => number = (_, s) => s.at,
): T | null {
  let best: { value: T; at: number } | null = null;
  for (const snapshot of snapshots) {
    const value = valueOf(snapshot);
    if (value === null) continue;
    const at = seenAt(value, snapshot);
    if (!best || at > best.at) best = { value, at };
  }
  return best?.value ?? null;
}

function largest(values: readonly (number | null)[]): number | null {
  const known = values.filter((value) => value !== null);
  return known.length === 0 ? null : Math.max(...known);
}

/** What the Macs of an account add up to: the public state without the page's visitors. */
export type MacsState = Omit<PublicPetState, "visitors">;

/** The public state of an account, from the snapshots of every Mac it ever connected. */
export function combineSnapshots(
  user: string,
  snapshots: readonly MacSnapshot[],
): MacsState {
  const firstDays = snapshots
    .map((snapshot) => snapshot.firstDay)
    .filter((day) => day !== null)
    .sort();
  return {
    user,
    updatedAt: largest(snapshots.map((snapshot) => snapshot.receivedAt)),
    tzOffsetMin: newest(snapshots, (snapshot) => snapshot.tzOffsetMin),
    firstDay: firstDays.at(0) ?? null,
    days: sumDays(snapshots.map((snapshot) => snapshot.days)),
    quota: newest(
      snapshots,
      (snapshot) => snapshot.quota,
      (quota, snapshot) => quota.at ?? snapshot.at,
    ),
    github: newest(
      snapshots,
      (snapshot) => snapshot.github,
      (github) => github.fetchedAt,
    ),
    merges: newest(snapshots, (snapshot) => snapshot.merges),
    party: newest(snapshots, (snapshot) => snapshot.party),
    growth: {
      highest: largest(snapshots.map((snapshot) => snapshot.growth.highest)),
      levelUp: newest(snapshots, (snapshot) => snapshot.growth.levelUp),
    },
    pet: {
      fed: largest(snapshots.map((snapshot) => snapshot.pet.fed)) ?? 0,
      patted: largest(snapshots.map((snapshot) => snapshot.pet.patted)) ?? 0,
    },
  };
}
