import { fillTemplate } from "./fill-template.ts";
import type { PetCopy } from "./types.ts";

export type Level = {
  lv: number;
  thresholdB: number;
  /** The pixel size in the approved 200×140 mockup; the scene scales it. */
  px: number;
  /** Rows drawn directly above the 12-row body, 16 columns each. */
  crown: readonly string[];
  isSeed?: boolean;
  hasBird?: boolean;
  hasPetals?: boolean;
  isGold?: boolean;
};

export const LEVELS: readonly Level[] = [
  {
    lv: 1,
    thresholdB: 0,
    px: 3,
    isSeed: true,
    crown: [".......G........", "........g......."],
  },
  {
    lv: 2,
    thresholdB: 20,
    px: 3.4,
    crown: [".....GG...GG....", "......GGgGG.....", "........g......."],
  },
  {
    lv: 3,
    thresholdB: 35,
    px: 3.8,
    crown: [
      "......gg..gg....",
      ".....gGGggGGg...",
      "......gggggg....",
      "........g.......",
    ],
  },
  {
    lv: 4,
    thresholdB: 60,
    px: 4.1,
    crown: [
      "........pp......",
      ".......pPPp.....",
      ".......pPPp.....",
      "....gG.ppp.Gg...",
      "...gGGg.g.gGGg..",
      "....ggggggggg...",
      "........g.......",
    ],
  },
  {
    lv: 5,
    thresholdB: 100,
    px: 4.4,
    crown: [
      "......P.P.P.....",
      ".....PPPYPPP....",
      "......PPpPP.....",
      "....gG..g..Gg...",
      "...gGGg.g.gGGg..",
      "....ggggggggg...",
      "........g.......",
    ],
  },
  {
    lv: 6,
    thresholdB: 180,
    px: 4.6,
    crown: [
      "......P.P.P.....",
      ".....PPPYPPP....",
      "......PPpPP.....",
      "...rgG..g..Ggr..",
      "..rrGGg.g.gGGrr.",
      "...rgggggggggr..",
      "........g.......",
    ],
  },
  {
    lv: 7,
    thresholdB: 320,
    px: 4.8,
    hasBird: true,
    crown: [
      ".....gGGGGg.....",
      "...gGGGGGGGGg...",
      "..gGGgGGGGgGGg..",
      "..gGGGGGGGGGGg..",
      "...ggGGGGGGgg...",
      ".....gggggg.....",
      ".......tt.......",
      ".......tt.......",
      "......tttt......",
    ],
  },
  {
    lv: 8,
    thresholdB: 560,
    px: 5,
    hasBird: true,
    hasPetals: true,
    crown: [
      ".....PGPGPP.....",
      "...gPGGpGGPGg...",
      "..PGGPGGPGGpGg..",
      "..gGpGGGGPGGGP..",
      "...ggGGpGGGgg...",
      ".....gggggg.....",
      ".......tt.......",
      ".......tt.......",
      "......tttt......",
    ],
  },
  {
    lv: 9,
    thresholdB: 1000,
    px: 5.2,
    isGold: true,
    crown: [
      "...h...hh...h...",
      ".....yLLLLy.....",
      "...yLLLLLLLLy...",
      "..yLLwLLLLwLLy..",
      "..yLLLLLLLLLLy..",
      "...yyLLLLLLyy...",
      ".....yyyyyy.....",
      ".......tt.......",
      ".......tt.......",
      "......tttt......",
    ],
  },
];

const MAX_LEVEL = LEVELS.length;

export function levelInfo(lv: number): Level {
  return LEVELS[Math.min(MAX_LEVEL, Math.max(1, lv)) - 1];
}

export function levelLabel(lv: number, copy: PetCopy) {
  const level = levelInfo(lv);

  return fillTemplate(copy.levelLabel, {
    lv: level.lv,
    name: copy.levelNames[level.lv - 1] ?? "",
  });
}

export const PIPS = 7;

export function levelForTokens(tokens: number) {
  let lv = 1;
  for (const level of LEVELS)
    if (tokens >= level.thresholdB * 1e9) lv = level.lv;

  return lv;
}

/** Filled pips, rounded down, for the way from this level's threshold to the next. */
export function pipsFor(level: number, tokens: number) {
  if (level >= MAX_LEVEL) return PIPS;
  const from = levelInfo(level).thresholdB * 1e9;
  const to = levelInfo(level + 1).thresholdB * 1e9;
  const share = Math.min(1, Math.max(0, (tokens - from) / (to - from)));

  return Math.min(PIPS, Math.floor(share * PIPS));
}
