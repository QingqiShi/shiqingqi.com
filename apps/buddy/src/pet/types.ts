export type PetDay = {
  day: string;
  tokens: number;
  costUsd: number;
  cacheRead?: number;
  promptTokens?: number;
};

export type PetLimit = { pct: number; resetsAt: number | null };

export type PetSample = { at: number; five?: number; week?: number };

export type PetQuota = {
  at: number | null;
  five: PetLimit | null;
  week: PetLimit | null;
  samples: PetSample[];
};

export type PetGithub = {
  fetchedAt: number;
  total: number;
  start: string;
  levels: string;
};

export type PetMergeDay = {
  day: string;
  prs: number;
  additions: number;
  deletions: number;
};

export type PetMerges = { from: string; days: PetMergeDay[] };

export type PetParty = { number: number; until: number };

export type PetGrowth = {
  highest: number | null;
  levelUp: { level: number; until: number } | null;
};

export type PetCounters = { fed: number; patted: number };

/**
 * What the public read API returns and the page renders. `days` is the sum over all machines.
 * `updatedAt` is the newest upload from any machine, or null before the first upload. `pet` counts
 * the owner's presses on their Macs, `visitors` the presses on the web page.
 */
export type PublicPetState = {
  user: string;
  updatedAt: number | null;
  tzOffsetMin: number | null;
  firstDay: string | null;
  days: PetDay[];
  quota: PetQuota | null;
  github: PetGithub | null;
  merges: PetMerges | null;
  party: PetParty | null;
  growth: PetGrowth;
  pet: PetCounters;
  visitors: PetCounters;
};

/**
 * What `GET /api/account/pet` returns to the owner: the public state, and what only the owner
 * needs to see, such as how many Macs are connected while the first upload is still to come.
 */
export type OwnerPetState = PublicPetState & { connectedMacs: number };

export type Bucket =
  | "happy"
  | "worry"
  | "sleep"
  | "away"
  | "party"
  | "night"
  | "streak"
  | "levelup"
  | "broken"
  | "feed"
  | "pat";

/** The pure modules take their text as data, because `t()` can only run in render. */
export type PetCopy = {
  petName: string;
  /** Sunday first. */
  weekdays: readonly string[];
  /** January first. */
  months: readonly string[];
  minutes: string;
  hours: string;
  hoursMinutes: string;
  agoMinutes: string;
  agoHours: string;
  agoDays: string;
  /** Level 1 first. */
  levelNames: readonly string[];
  levelLabel: string;
  lines: Record<Bucket, readonly string[]>;
  capsule: { out: string; over: string };
  tiles: {
    cost: string;
    streak: string;
    streakUnit: string;
    cacheHit: string;
  };
  trend: { peak: string; average: string };
  merges: {
    added: string;
    deleted: string;
    prs: string;
    noneToday: string;
    today: string;
  };
  heatmap: { less: string; more: string };
  view: {
    five: string;
    week: string;
    resetDone: string;
    resetIn: string;
    resetAt: string;
    out: string;
    outUntil: string;
    basisFiveRecent: string;
    basisFiveAverage: string;
    basisWeekRecent: string;
    basisWeekAverage: string;
    forecastFull: string;
    forecastFive: string;
    forecastWeek: string;
    recent: string;
    sinceThisYear: string;
    sinceOtherYear: string;
    tokensRecent: string;
    tokensAll: string;
    merged: string;
    used: string;
    trend: string;
    github: string;
    updated: string;
  };
};

export type Range = "30" | "all";
