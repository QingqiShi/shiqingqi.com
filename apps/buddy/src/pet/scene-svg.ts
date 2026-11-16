import type { Level } from "./levels.ts";
import { LEVELS, levelInfo } from "./levels.ts";
import type { Mood } from "./mood-of.ts";
import { BREEZE_S, CLOUD_LEAD, sceneCss } from "./scene-css.ts";
import { sceneInk } from "./scene-ink.stylex.ts";
import type { SkyPalette } from "./sky-palette.ts";
import { skyPalette } from "./sky-palette.ts";
import { spriteRuns } from "./sprite-runs.ts";
import { esc, n, svg, svgOpen, textWidth, uid } from "./svg.ts";

const SEED_SINK = 6;
/** From this width on the scene is a wide window: the bubble sits beside the pet, not over it. */
const WIDE_WIDTH = 720;
/** The strip under the top inset that the corner marks take. The sky's objects and the bubble stay under it. */
const TOP_STRIP = 48;
const TAIL = 10;
const TAIL_GAP = 6;
/** How high the hop takes the pet, in sprite cells. The bubble over the pet goes up as far. */
const HOP_CELLS = 4.6;
/** How many blades of grass move as one. */
const TUFT_BLADES = 5;
/** How many groups the stars twinkle in. */
const STAR_GROUPS = 10;

export const BUBBLE_ROWS = 3;
const BUBBLE_PAD = 12;
const BUBBLE_MIN_UNITS = 8;
const BUBBLE_MAX_UNITS = 22;
const INK = sceneInk.ink;
const PAPER = sceneInk.paper;

const COLORS: Record<string, string> = {
  o: "#6B5A48",
  b: "#FFF4E6",
  d: "#EBD9C2",
  g: "#3F8F4A",
  G: "#8FD17A",
  E: "#2E2420",
  c: "#F7A8A8",
  m: "#2E2420",
  p: "#EC4899",
  P: "#F9A8D4",
  Y: "#FFE066",
  r: "#E53935",
  t: "#7A5230",
  y: "#D9A21B",
  L: "#FFE08A",
  h: "#FFF3B0",
  w: "#FFFFFF",
};

const BODY = [
  ".....oooooo.....",
  "...oobbbbbboo...",
  "..obbbbbbbbbbo..",
  ".obbbbbbbbbbbbo.",
  ".obbEEbbbbEEbbo.",
  "obbbEEbbbbEEbbbo",
  "obbcbbbmmbbbcbbo",
  "obbbbbbbbbbbbbbo",
  "obdbbbbbbbbbbdbo",
  ".oddbbbbbbbbddo.",
  "..oodddddddoo...",
  "....ooooooo.....",
];

/** The tallest pet in sprite units: the pet's scale is set so that it fits the room the scene has. */
const TALLEST_UNITS = Math.max(
  ...LEVELS.map((level) => level.px * (level.crown.length + BODY.length)),
);

/** Eye pixels per mood, as [x, y] in body rows; every other `E` cell is drawn as skin. */
const EYES: Record<
  "squint" | "shut" | "smile",
  ReadonlyArray<[number, number]>
> = {
  squint: [
    [4, 5],
    [5, 5],
    [10, 5],
    [11, 5],
  ],
  shut: [
    [3, 4],
    [6, 4],
    [4, 5],
    [5, 5],
    [9, 4],
    [12, 4],
    [10, 5],
    [11, 5],
  ],
  smile: [
    [4, 4],
    [5, 4],
    [3, 5],
    [6, 5],
    [10, 4],
    [11, 4],
    [9, 5],
    [12, 5],
  ],
};

/** Sparkles of the gold level, clockwise from the top left, in sprite cells. */
const SPARKLES: ReadonlyArray<[number, number]> = [
  [1.5, -0.6],
  [14.5, -0.6],
  [17, 5],
  [17.6, 12.5],
  [16.6, 19],
  [-0.6, 19],
  [-1.6, 12.5],
  [-1, 5],
];

/** The box the scene fills, in CSS pixels. `topInset` is the part under the phone's status bar. */
export type SceneBox = {
  width: number;
  height: number;
  topInset: number;
};

export type SceneInput = SceneBox & {
  mood: Mood;
  action: "feed" | "pat" | null;
  isConfetti: boolean;
  level: number;
  isDay: boolean;
  rows: readonly string[];
  isPop: boolean;
  /** The count of the pats, the waterings and the new lines so far. A move plays again when it changes. */
  beat: number;
  /** The count of the hops so far. It stays the same while the pet is in the air, so a second pat does not pull it down. */
  hop: number;
};

type Layout = {
  level: Level;
  /** The size of one sprite cell in scene pixels. */
  s: number;
  x0: number;
  y0: number;
  crownRows: number;
  bodyTop: number;
  groundY: number;
  petCx: number;
  isWide: boolean;
  font: number;
  line: number;
};

function bubbleFont(width: number) {
  return width >= WIDE_WIDTH ? 15 : 14;
}

/** The widest the bubble gets. Beside the pet it leaves the pet its half of the window. */
function bubbleMaxWidth(width: number) {
  return width >= WIDE_WIDTH
    ? Math.min(380, width / 2 - 152)
    : Math.min(340, width - 32);
}

/** How many CJK characters fit on one row of the bubble. */
export function bubbleUnits(width: number) {
  const font = bubbleFont(width);
  const fit = Math.floor((bubbleMaxWidth(width) - 2 * BUBBLE_PAD) / font);

  return Math.max(BUBBLE_MIN_UNITS, Math.min(BUBBLE_MAX_UNITS, fit));
}

function layoutOf(input: SceneInput): Layout {
  const { width: W, height: H, topInset } = input;
  const isWide = W >= WIDE_WIDTH;
  const groundY = H - Math.max(32, Math.min(56, Math.round(H * 0.12)));
  const font = bubbleFont(W);
  const line = font + 7;
  const bubbleRoom = isWide ? 0 : 16 + BUBBLE_ROWS * line + TAIL + TAIL_GAP;
  const room = groundY - topInset - TOP_STRIP - bubbleRoom;
  const k = Math.max(0.8, Math.min(isWide ? 2.2 : 1.8, room / TALLEST_UNITS));
  const level = levelInfo(input.level);
  const s = Math.round(level.px * k * 4) / 4;
  const crownRows = level.crown.length;
  const petCx = W / 2;
  const x0 = Math.round(petCx - 8 * s);
  const y0 = Math.round(
    groundY - (crownRows + BODY.length - (level.isSeed ? SEED_SINK : 0)) * s,
  );

  return {
    level,
    s,
    x0,
    y0,
    crownRows,
    bodyTop: y0 + crownRows * s,
    groundY,
    petCx,
    isWide,
    font,
    line,
  };
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function birdSvg(id: string) {
  return svg`<g class="bird-${id}"><g class="birdturn-${id}"><rect x="12" y="-1" width="2" height="2" fill="#60A5FA"/><rect x="14" y="-.4" width="1" height=".6" fill="#F59E0B"/><rect x="13" y="-.7" width=".5" height=".5" fill="#0B1020"/></g></g>`;
}

function petalsSvg(id: string) {
  const random = rng(53);
  let out = "";
  for (let i = 0; i < 7; i++) {
    const x = (3 + random() * 9).toFixed(1);
    const y = (random() * 5).toFixed(1);
    const delay = (random() * 3).toFixed(2);
    const duration = (2.8 + random() * 1.8).toFixed(2);
    const drift = (1.3 + random() * 0.9).toFixed(2);
    out += svg`<g class="petal-${id}" style="animation-delay:-${delay}s;animation-duration:${duration}s"><rect class="flutter-${id}" style="animation-duration:${drift}s" x="${x}" y="${y}" width=".6" height=".6" fill="#F9A8D4"/></g>`;
  }

  return out;
}

function goldSvg(layout: Layout, id: string, isAsleep: boolean) {
  const rows = layout.crownRows + BODY.length;
  const aura = svg`<defs><radialGradient id="aura-${id}"><stop offset="0" stop-color="#FFD866" stop-opacity=".85"/><stop offset="1" stop-color="#FFD866" stop-opacity="0"/></radialGradient></defs><ellipse class="aura-${id}" cx="8" cy="${rows / 2}" rx="11" ry="${rows / 2 + 2}" fill="url(#aura-${id})"/>`;
  if (isAsleep) return aura;
  const sparkles = SPARKLES.map(
    ([x, y], i) =>
      svg`<g class="spark-${id}" style="animation-delay:-${(i * 0.37).toFixed(2)}s" fill="#FFE9A8"><rect x="${x - 0.3}" y="${y - 0.9}" width=".6" height="1.8"/><rect x="${x - 0.9}" y="${y - 0.3}" width="1.8" height=".6"/></g>`,
  ).join("");

  return aura + sparkles;
}

type Face = "open" | keyof typeof EYES;

/** The pet shuts its eyes with joy while someone cares for it; a pet that sleeps stays asleep. */
function faceOf(input: SceneInput): Face {
  if (input.mood === "sleep") return "shut";
  if (input.action !== null || input.isConfetti || input.mood === "party")
    return "smile";

  return input.mood === "worry" ? "squint" : "open";
}

function eyesSvg(face: Face, crownRows: number) {
  if (face === "open")
    return spriteRuns(BODY, crownRows, (ch) => (ch === "E" ? COLORS.E : null));
  const cells = EYES[face];

  return spriteRuns(BODY, crownRows, (_, x, y) =>
    cells.some(([ex, ey]) => ex === x && ey === y - crownRows)
      ? COLORS.E
      : null,
  );
}

/** How the pet moves when nothing happens to it. */
function motionOf(input: SceneInput) {
  if (input.mood === "sleep") return "sleep";

  return input.isConfetti ? "party" : input.mood;
}

/**
 * The pet is a stack of groups, and each group has one motion: the answer to a pat or to water,
 * then the mood's own move, then the breath. The crown and the eyes are inside, and they move
 * later than the body does.
 */
function petSvg(input: SceneInput, layout: Layout, id: string) {
  const { level, crownRows: C } = layout;
  const isAsleep = input.mood === "sleep";
  const motion = motionOf(input);
  const take = input.beat % 2 === 0 ? "a" : "b";
  const hopTake = input.hop % 2 === 0 ? "a" : "b";
  const face = faceOf(input);
  const footRow = C + BODY.length - (level.isSeed === true ? SEED_SINK : 0);
  const foot = svg`transform-origin:8px ${footRow}px`;
  const stem = svg`transform-origin:8px ${C}px`;

  const crown =
    spriteRuns(level.crown, 0, (ch) => COLORS[ch] ?? null, true) +
    (level.hasBird === true ? birdSvg(id) : "");
  const body = spriteRuns(BODY, C, (ch, x) => {
    if (ch === ".") return null;
    if (ch === "E") return COLORS.b;
    if (isAsleep && ch === "m" && x === 8) return COLORS.b;

    return COLORS[ch] ?? null;
  });

  let fx = level.hasPetals === true ? petalsSvg(id) : "";
  if (input.mood === "worry") {
    fx += svg`<g class="sweat-${id}"><rect x="15" y="${C + 1}" width="1" height="1" fill="#7DD3FC"/><rect x="15" y="${C + 2}" width="1" height="1" fill="#38BDF8"/></g>`;
  }
  if (input.action === "feed") {
    const heart = (x: number, y: number, fill: string, delay: number) =>
      svg`<g class="heart${take}-${id}" style="animation-delay:${delay}s"><rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/><rect x="${x + 2}" y="${y}" width="1" height="1" fill="${fill}"/><rect x="${x}" y="${y + 1}" width="3" height="1" fill="${fill}"/><rect x="${x + 1}" y="${y + 2}" width="1" height="1" fill="${fill}"/></g>`;
    fx += heart(0, C - 1, "#F472B6", 0.5) + heart(13, C - 3, "#F9A8D4", 0.68);
    fx += [6, 9, 11]
      .map(
        (x, i) =>
          svg`<rect class="drop${take}-${id}" style="animation-delay:${(i * 0.13).toFixed(2)}s" x="${x}" y="-6" width="1" height="1.4" fill="#7DD3FC"/>`,
      )
      .join("");
  }

  const isHop = input.action === "pat" && !isAsleep;
  const act =
    input.action === "feed"
      ? svg`sip${take}`
      : input.action === "pat"
        ? svg`${isAsleep ? "jelly" : "hop"}${hopTake}`
        : "none";
  const crownAct = isHop
    ? svg`crownhop${hopTake}`
    : input.action === "feed"
      ? svg`crownsip${take}`
      : svg`crown-${motion}`;
  const shade =
    level.isSeed === true
      ? ""
      : svg`<ellipse class="${isHop ? svg`shadehop${hopTake}` : svg`shade-${motion}`}-${id}" style="transform-origin:8px ${footRow}px" cx="8" cy="${footRow + 0.35}" rx="6.6" ry=".9" fill="rgba(0,0,0,.2)"/>`;
  const back =
    level.isGold === true ? goldSvg(layout, id, input.mood === "sleep") : "";
  const eyes = svg`<g class="${face === "open" ? "look" : face === "squint" ? "dart" : "still"}-${id}"><g class="${face === "open" ? "blink" : "still"}-${id}">${eyesSvg(face, C)}</g></g>`;
  const pet = svg`<g transform="translate(${n(layout.x0)},${n(layout.y0)}) scale(${layout.s.toFixed(3)})">${shade}<g class="${act}-${id}" style="${foot}">${back}<g class="move-${motion}-${id}" style="${foot}"><g class="tilt-${motion}-${id}" style="${foot}"><g class="breathe-${motion}-${id}" style="${foot}"><g class="${crownAct}-${id}" style="${stem}"><g class="sway-${motion}-${id}" style="${stem}">${crown}</g></g>${body}${eyes}</g></g></g></g>${fx}</g>`;

  return level.isSeed === true
    ? svg`<g clip-path="url(#soil-${id})">${pet}</g>`
    : pet;
}

/**
 * The bubble sits over the pet, its tail down to the crown. In a wide window it sits beside the
 * pet at the height of its face, with the tail towards it.
 */
function bubbleSvg(input: SceneInput, layout: Layout, id: string) {
  const rows = input.rows;
  if (rows.length === 0) return "";
  const { font, line } = layout;
  const textW = Math.max(...rows.map((row) => textWidth(row, font)));
  const w = Math.round(
    Math.min(input.width - 24, Math.max(3 * font, textW) + 2 * BUBBLE_PAD),
  );
  const h = 16 + rows.length * line;
  const minY = input.topInset + TOP_STRIP;
  const r = (rx: number, ry: number, rw: number, rh: number, fill: string) =>
    svg`<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="${fill}"/>`;
  let x: number;
  let y: number;
  let tail: string;
  let origin: string;
  if (layout.isWide) {
    x = Math.round(layout.x0 + 16 * layout.s + 18);
    const faceY = layout.bodyTop + 4.5 * layout.s;
    y = Math.round(
      Math.max(minY, Math.min(layout.groundY - h - 8, faceY - h / 2)),
    );
    const ty = Math.round(Math.max(y + 8, Math.min(y + h - 18, faceY - 6)));
    tail =
      r(x, ty + 2, 2, 4, PAPER) +
      r(x - 2, ty + 2, 2, 4, PAPER) +
      r(x - 4, ty + 4, 2, 2, PAPER) +
      r(x - 2, ty, 2, 2, INK) +
      r(x - 4, ty + 2, 2, 2, INK) +
      r(x - 6, ty + 4, 2, 2, INK) +
      r(x - 6, ty + 6, 6, 2, INK);
    origin = svg`${x}px ${ty + 4}px`;
  } else {
    x = Math.round((input.width - w) / 2);
    y = Math.max(minY, Math.round(layout.y0 - TAIL_GAP - TAIL - h));
    const tx = Math.round(x + w / 2);
    const b = y + h;
    tail =
      r(tx - 6, b - 2, 12, 2, INK) +
      r(tx - 4, b, 8, 2, INK) +
      r(tx - 2, b + 2, 4, 2, INK) +
      r(tx - 4, b - 2, 8, 2, PAPER) +
      r(tx - 2, b, 4, 2, PAPER);
    origin = svg`${tx}px ${b + 4}px`;
  }
  const frame =
    r(x + 4, y + 2, w - 8, h - 4, PAPER) +
    r(x + 2, y + 4, w - 4, h - 8, PAPER) +
    r(x + 4, y, w - 8, 2, INK) +
    r(x + 4, y + h - 2, w - 8, 2, INK) +
    r(x, y + 4, 2, h - 8, INK) +
    r(x + w - 2, y + 4, 2, h - 8, INK) +
    r(x + 2, y + 2, 2, 2, INK) +
    r(x + w - 4, y + 2, 2, 2, INK) +
    r(x + 2, y + h - 4, 2, 2, INK) +
    r(x + w - 4, y + h - 4, 2, 2, INK);
  const shadow =
    r(x + 4, y + h, w - 6, 2, "rgba(0,0,0,0.28)") +
    r(x + w, y + 4, 2, h - 4, "rgba(0,0,0,0.28)");
  const text = rows
    .map(
      (row, i) =>
        svg`<text x="${x + BUBBLE_PAD}" y="${y + 8 + font + i * line}" font-size="${font}" fill="${INK}">${esc(row)}</text>`,
    )
    .join("");

  const take = input.beat % 2 === 0 ? "a" : "b";
  // Over the pet, the bubble is in the way of a hop, so the pet pushes it up.
  const isBumped =
    input.action === "pat" && input.mood !== "sleep" && !layout.isWide;

  const bump = isBumped
    ? svg`bump${input.hop % 2 === 0 ? "a" : "b"}`
    : motionOf(input) === "party" && !layout.isWide
      ? "bumpparty"
      : "none";

  return svg`<g class="float-${id}"><g class="${bump}-${id}"><g class="${input.isPop ? svg`pop${take}` : "none"}-${id}" style="transform-origin:${origin}"><g shape-rendering="crispEdges">${shadow}${frame}${tail}</g>${text}</g></g></g>`;
}

function groundSvg(
  input: SceneInput,
  layout: Layout,
  palette: SkyPalette,
  random: () => number,
  id: string,
  isGlowing: boolean,
) {
  const { width: W, height: H } = input;
  const { groundY, petCx, s } = layout;
  let out = svg`<ellipse class="${isGlowing ? svg`glow-${id}` : ""}" cx="${n(petCx)}" cy="${groundY + 2}" rx="${n(10 * s)}" ry="${n(Math.max(12, 2.5 * s))}" fill="url(#glow-${id})"/>`;
  out += svg`<rect y="${groundY}" width="${W}" height="${H - groundY}" fill="${palette.ground}"/>`;
  // A wind goes through the grass from the left: each tuft moves a little later than the last.
  // The blades of a tuft move as one, so that a wide window does not animate each blade.
  let tuft = "";
  for (let x = 0, i = 1; x < W; x += 9, i++) {
    const hh = 3 + Math.round(random() * 4);
    tuft += svg`<rect x="${x}" y="${groundY - hh}" width="2" height="${hh}"/>`;
    if (i % TUFT_BLADES !== 0 && x + 9 < W) continue;
    const delay = ((x / 240) % BREEZE_S).toFixed(2);
    out += svg`<g class="blade-${id}" style="animation-delay:-${delay}s" fill="${palette.tuft}">${tuft}</g>`;
    tuft = "";
  }

  return out;
}

function skySvg(input: SceneInput, layout: Layout, id: string) {
  const { width: W, height: H, topInset } = input;
  const isWorry = input.mood === "worry";
  const palette = skyPalette(input.isDay, isWorry);
  const { top, bottom, light, cloud: cloudFill, glow } = palette;
  const random = rng(11);
  const skyTop = topInset + TOP_STRIP;
  const u = layout.isWide ? 2 : 1.5;
  const lightX = W - 44 * u;
  const lightY = skyTop + 24;
  let s = svg`<defs><linearGradient id="sky-${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient><radialGradient id="glow-${id}"><stop offset="0" stop-color="${glow}" stop-opacity="${input.isDay ? ".7" : ".9"}"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient></defs>`;
  s += svg`<rect width="${W}" height="${H}" fill="url(#sky-${id})"/>`;
  if (input.isDay) {
    s += svg`<g transform="translate(${n(lightX)},${n(lightY)}) scale(${u})" fill="${light}"><g class="sunturn-${id}" style="transform-origin:8px 8px"><g class="sunray-${id}" style="transform-origin:8px 8px"><rect x="7" y="-8" width="2" height="4"/><rect x="7" y="20" width="2" height="4"/><rect x="-8" y="7" width="4" height="2"/><rect x="20" y="7" width="4" height="2"/><rect x="-4" y="-4" width="2" height="2"/><rect x="18" y="-4" width="2" height="2"/><rect x="-4" y="18" width="2" height="2"/><rect x="18" y="18" width="2" height="2"/></g></g><g shape-rendering="crispEdges"><rect width="16" height="16"/><rect x="-2" y="2" width="20" height="12"/><rect x="2" y="-2" width="12" height="20"/><rect x="2" y="2" width="4" height="4" fill="#FFF7D1"/></g></g>`;
    // Each cloud is drawn left of the window and crosses it. A negative delay starts it at `cx`,
    // and the attribute puts it there when nothing moves.
    const cloud = (cx: number, cy: number, k: number, seconds: number) => {
      const delay = ((seconds * (cx + CLOUD_LEAD)) / (W + CLOUD_LEAD)).toFixed(
        1,
      );

      return svg`<g class="cloud-${id}" transform="translate(${cx + CLOUD_LEAD},0)" style="animation-duration:${seconds}s;animation-delay:-${delay}s"><g class="cloudbob-${id}" style="animation-delay:-${delay}s" shape-rendering="crispEdges" fill="${cloudFill}" opacity=".92"><rect x="${-CLOUD_LEAD}" y="${cy + 4 * k}" width="${22 * k}" height="${4 * k}"/><rect x="${-CLOUD_LEAD + 4 * k}" y="${cy}" width="${8 * k}" height="${4 * k}"/><rect x="${-CLOUD_LEAD + 10 * k}" y="${cy - 2 * k}" width="${6 * k}" height="${6 * k}"/></g></g>`;
    };
    s +=
      cloud(Math.round(W * 0.08), skyTop + 26, 1.2 * u, 96) +
      cloud(Math.round(W * 0.46), skyTop + 64, 0.8 * u, 140);
    if (layout.isWide) s += cloud(Math.round(W * 0.74), skyTop + 118, u, 118);
    s += groundSvg(input, layout, palette, random, id, false);

    return s;
  }

  const stars = Math.max(24, Math.min(90, Math.round((W * H) / 3200)));
  // The stars twinkle in a few groups, each at its own pace, so that many stars cost few animations.
  const twinkles = Array.from({ length: STAR_GROUPS }, () => "");
  for (let i = 0; i < stars; i++) {
    const x = Math.round(random() * (W - 8));
    const y = Math.round(random() * Math.max(40, layout.groundY - 40));
    const z = random() < 0.3 ? 2 : 1;
    twinkles[i % STAR_GROUPS] +=
      svg`<rect x="${x}" y="${y}" width="${z}" height="${z}"/>`;
  }
  for (const group of twinkles) {
    const delay = (random() * 5).toFixed(2);
    const duration = (1.6 + random() * 2.6).toFixed(2);
    s += svg`<g class="star-${id}" fill="#FFF6D6" style="animation-delay:-${delay}s;animation-duration:${duration}s">${group}</g>`;
  }
  if (!isWorry) {
    s += svg`<g class="comet-${id}" fill="#FFF6D6"><rect x="${n(W * 0.12)}" y="${skyTop + 6}" width="3" height="3"/><rect x="${n(W * 0.12) - 5}" y="${skyTop + 4}" width="4" height="2" opacity=".6"/><rect x="${n(W * 0.12) - 11}" y="${skyTop + 2}" width="5" height="1" opacity=".3"/></g>`;
  }
  s += svg`<g transform="translate(${n(lightX)},${n(lightY)}) scale(${u})"><g class="moon-${id}" shape-rendering="crispEdges"><g fill="${light}"><rect x="2" width="12" height="12"/><rect y="2" width="2" height="8"/><rect x="14" y="2" width="2" height="8"/><rect x="4" y="-2" width="8" height="2"/><rect x="4" y="12" width="8" height="2"/></g><rect x="6" width="10" height="10" fill="${top}" opacity=".9"/></g></g>`;
  s += groundSvg(input, layout, palette, random, id, true);
  if (!isWorry) {
    const flies = layout.isWide ? 9 : 5;
    for (let i = 0; i < flies; i++) {
      const x = Math.round(8 + random() * (W - 24));
      const y = Math.round(layout.groundY - 90 + random() * 70);
      const delay = (random() * 6).toFixed(2);
      const duration = (6.5 + random() * 4).toFixed(1);
      s += svg`<g class="fly${i % 3}-${id}" style="animation-delay:-${delay}s;animation-duration:${duration}s"><rect class="flyglow-${id}" x="${x}" y="${y}" width="2" height="2" fill="#E9FF8A" style="animation-delay:-${delay}s"/></g>`;
    }
  }

  return s;
}

function sleepSvg(layout: Layout, id: string) {
  const k = Math.max(2, Math.round(layout.s / 2));
  const z = (x: number, y: number, size: number, delay: number) =>
    svg`<g class="z-${id}" style="animation-delay:${delay}s" fill="#E8F1FF" shape-rendering="crispEdges"><rect x="${x}" y="${y}" width="${5 * size}" height="${size}"/><rect x="${x + 3 * size}" y="${y + size}" width="${size}" height="${size}"/><rect x="${x + 2 * size}" y="${y + 2 * size}" width="${size}" height="${size}"/><rect x="${x + size}" y="${y + 3 * size}" width="${size}" height="${size}"/><rect x="${x}" y="${y + 4 * size}" width="${5 * size}" height="${size}"/></g>`;

  const x = n(layout.x0 + 14 * layout.s + 2);
  const y = n(layout.bodyTop + 1.5 * layout.s - 5 * k);

  return (
    z(x, y, k, 0) +
    z(x + 4 * k, y - 11 * k, k, 1.5) +
    z(x + 6 * k, y - 23 * k, k + 1, 3)
  );
}

function confettiSvg(W: number, id: string) {
  const random = rng(29);
  const colors = ["#F472B6", "#FCD34D", "#8FD17A", "#7DD3FC", "#FB923C"];
  const count = Math.max(14, Math.min(60, Math.round(W / 22)));
  let s = "";
  for (let i = 0; i < count; i++) {
    const x = Math.round(6 + random() * (W - 12));
    const delay = (random() * 3.2).toFixed(2);
    const fall = (2.6 + random() * 1.4).toFixed(2);
    const flutter = (0.7 + random() * 0.7).toFixed(2);
    s += svg`<g class="confetti-${id}" style="animation-delay:-${delay}s;animation-duration:${fall}s"><rect class="tumble-${id}" style="animation-duration:${flutter}s" x="${x}" y="-6" width="3" height="4" fill="${colors[i % colors.length]}"/></g>`;
  }

  return s;
}

/** The pet's window: the sky, the ground, the pet in the middle and its bubble, filling `width` × `height`. */
export function sceneSvg(input: SceneInput) {
  const { width: W, height: H } = input;
  // The names stay the same while the box does, so a new line or a pat starts no loop again.
  const id = uid("scene", W, H, input.topInset, input.level);
  const layout = layoutOf(input);

  return svg`${svgOpen(W, H, { cover: true })}${sceneCss(id, W, H, n(HOP_CELLS * layout.s))}<defs><clipPath id="soil-${id}"><rect width="${W}" height="${layout.groundY}"/></clipPath></defs><g class="scene-${id}">${skySvg(input, layout, id)}${input.isConfetti ? confettiSvg(W, id) : ""}${petSvg(input, layout, id)}${input.mood === "sleep" ? sleepSvg(layout, id) : ""}${bubbleSvg(input, layout, id)}</g></svg>`;
}
