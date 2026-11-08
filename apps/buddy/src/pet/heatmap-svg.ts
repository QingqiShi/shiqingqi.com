import { dayFromNumber, dayNumber, weekdayOf } from "./local-time.ts";
import {
  esc,
  ld,
  n,
  paletteCss,
  svg,
  svgOpen,
  textWidth,
  todayCss,
  uid,
} from "./svg.ts";
import type { PetCopy, PetDay } from "./types.ts";

type Ramp = {
  dark: readonly string[];
  light: readonly string[];
  ring: { dark: string; light: string };
};

const CLAY: Ramp = {
  dark: ["#62301F", "#93442A", "#C8603F", "#F0997B"],
  light: ["#F5C4B3", "#F0997B", "#D97757", "#993C1D"],
  ring: { dark: "#D97757", light: "#D97757" },
};

const GREEN: Ramp = {
  dark: ["#0E4429", "#006D32", "#26A641", "#39D353"],
  light: ["#9BE9A8", "#40C463", "#30A14E", "#216E39"],
  ring: { dark: "#39D353", light: "#1A7F37" },
};

type Entrance = {
  name: string;
  css: (id: string) => string;
  delay: (column: number, row: number) => number;
};

const POP: Entrance = {
  name: "pop",
  css: (
    id,
  ) => svg`.pop-${id}{transform-box:fill-box;transform-origin:center;animation:pop-${id} .35s cubic-bezier(.3,1.6,.5,1) backwards}
@keyframes pop-${id}{from{transform:scale(0)}to{transform:scale(1)}}
@media (prefers-reduced-motion: reduce){.pop-${id}{animation:none}}`,
  delay: (c, r) => c * 12 + r * 8,
};

const GLINT: Entrance = {
  name: "gl",
  css: (
    id,
  ) => svg`.gl-${id}{animation:gl-${id} .7s ease-out}@keyframes gl-${id}{0%,100%{filter:brightness(1)}40%{filter:brightness(1.9)}}
@media (prefers-reduced-motion: reduce){.gl-${id}{animation:none}}`,
  delay: (c) => c * 25,
};

const HEAT_WEEKS = 53;

type HeatmapOptions = {
  width: number;
  today: string;
  isIntro: boolean;
  copy: PetCopy;
};

type Look = {
  ramp: Ramp;
  entrance: Entrance;
  levelOn: LevelOn;
  key: string;
};

export function heatmapSvg(
  { width, today, isIntro, copy }: HeatmapOptions,
  { ramp, entrance: introEntrance, levelOn, key }: Look,
) {
  const entrance = isIntro ? introEntrance : null;
  const W = width;
  const ringOut = 2.75;
  const pitch = (W - ringOut) / (HEAT_WEEKS - 1 + 14 / 17);
  const cell = pitch * (14 / 17);
  const radius = n(cell * 0.25);
  const gridRight = (HEAT_WEEKS - 1) * pitch + cell;
  const todayN = dayNumber(today);
  const startN = todayN - weekdayOf(today) - (HEAT_WEEKS - 1) * 7;
  const top = 18;
  const H = Math.ceil(top + 7 * pitch + 18);
  const id = uid("heat", W, today, key, entrance?.name ?? "");
  let cells = "";
  const starts: Array<{ x: number; label: string }> = [];
  for (let c = 0; c < HEAT_WEEKS; c++) {
    const colStart = startN + c * 7;
    for (let r = 0; r < 7; r++) {
      const dn = colStart + r;
      if (dn > todayN) continue;
      const level = levelOn(dn);
      const classes = svg`k${level ?? 0}-${id}${level === null ? svg` nd-${id}` : ""}${entrance === null ? "" : svg` ${entrance.name}-${id}`}`;
      const delay =
        entrance === null
          ? ""
          : svg` style="animation-delay:${entrance.delay(c, r)}ms"`;
      cells += svg`<rect class="${classes}"${delay} x="${n(c * pitch)}" y="${n(top + r * pitch)}" width="${n(cell)}" height="${n(cell)}" rx="${radius}"/>`;
      if (dn === todayN) {
        cells += svg`<rect class="ring-${id} tdp-${id}" x="${n(c * pitch - 2)}" y="${n(top + r * pitch - 2)}" width="${n(cell + 4)}" height="${n(cell + 4)}" rx="${n(cell * 0.3 + 1.5)}" fill="none" stroke-width="1.5"/>`;
      }
    }
    const first = Array.from({ length: 7 }, (_, r) =>
      dayFromNumber(colStart + r),
    ).find((day) => day.endsWith("-01"));
    if (first !== undefined)
      starts.push({
        x: c * pitch,
        label: copy.months[Number(first.slice(5, 7)) - 1] ?? "",
      });
  }
  const place = (labels: typeof starts) => {
    let freeX = 0;
    const placed: typeof starts = [];
    for (const { x, label } of labels) {
      const at = Math.min(x, W - textWidth(label, 11));
      if (at < freeX) continue;
      placed.push({ x: at, label });
      freeX = at + textWidth(label, 11) + 6;
    }
    return placed;
  };
  const every = place(starts);
  const shown =
    every.length === starts.length
      ? every
      : place(starts.filter((_, i) => (starts.length - 1 - i) % 2 === 0));
  const months = shown
    .map(
      ({ x, label }) =>
        svg`<text x="${n(x)}" y="11" font-size="11" class="t3-${id}">${esc(label)}</text>`,
    )
    .join("");
  const lessW = textWidth(copy.heatmap.less, 11) + 3;
  const legendW = lessW + 5 * 12 + 2 + textWidth(copy.heatmap.more, 11);
  const lx = gridRight - legendW;
  const ly = H - 12;
  const legend = svg`<text x="${n(lx)}" y="${ly + 9}" font-size="11" class="t3-${id}">${esc(copy.heatmap.less)}</text>${[
    0, 1, 2, 3, 4,
  ]
    .map(
      (k) =>
        svg`<rect class="k${k}-${id}" x="${n(lx + lessW + k * 12)}" y="${ly}" width="10" height="10" rx="2.5"/>`,
    )
    .join(
      "",
    )}<text x="${n(lx + lessW + 5 * 12 + 2)}" y="${ly + 9}" font-size="11" class="t3-${id}">${esc(copy.heatmap.more)}</text>`;
  const kinds = ramp.light
    .map(
      (color, i) =>
        svg`.k${i + 1}-${id}{fill:${ld(color, ramp.dark[i] ?? color)}}`,
    )
    .join("");

  return svg`${svgOpen(W, H)}<style>${paletteCss(id)}
.k0-${id}{fill:${ld("rgba(0,0,0,0.07)", "rgba(255,255,255,0.08)")}}${kinds}.ring-${id}{stroke:${ld(ramp.ring.light, ramp.ring.dark)}}.nd-${id}{opacity:.35}
${entrance === null ? "" : entrance.css(id)}
${todayCss(id)}
</style>${months}${cells}${legend}</svg>`;
}

/** The heat level 0 to 4 of a day number, or null before the first day with data. */
type LevelOn = (day: number) => number | null;

function usageLevels(days: readonly PetDay[], firstDay: string): LevelOn {
  const tokens = new Map(days.map((d) => [dayNumber(d.day), d.tokens]));
  const max = Math.max(1, ...days.map((d) => d.tokens));
  const firstN = dayNumber(firstDay);

  return (dn) => {
    if (dn < firstN) return null;
    const v = tokens.get(dn) ?? 0;

    return v === 0 ? 0 : Math.min(4, 1 + Math.floor((v / max) * 3.99));
  };
}

/** `levels` holds one digit per day from `start` on, as GitHub's contribution calendar gives them. */
function githubLevels(start: string, levels: string): LevelOn {
  const startN = dayNumber(start);

  return (dn) => (dn < startN ? null : Number(levels[dn - startN] ?? "0"));
}

export function usageHeatmap(days: readonly PetDay[], firstDay: string): Look {
  return {
    ramp: CLAY,
    entrance: POP,
    levelOn: usageLevels(days, firstDay),
    key: svg`${firstDay}|${days.map((d) => svg`${d.day}:${d.tokens}`).join(",")}`,
  };
}

export function githubHeatmap(start: string, levels: string): Look {
  return {
    ramp: GREEN,
    entrance: GLINT,
    levelOn: githubLevels(start, levels),
    key: svg`${start}|${levels}`,
  };
}
