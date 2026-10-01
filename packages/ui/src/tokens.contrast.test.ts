import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileStylexCss, readCustomProperty } from "@tuja/stylex-testing";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast/contrast-ratio.ts";
import { hexChannels } from "./contrast/hex-channels.ts";
import { apcaContrast } from "./test-support/apca-contrast.ts";
import { color } from "./tokens.stylex.ts";

// Guards the text ladder against the two ways it can rot: a level drifting
// under its APCA floor on a surface it lands on, and the two levels drifting
// together until they stop reading as separate levels.
//
// `fg` carries body copy, so it takes APCA's 16px body floor; `fgMuted`
// carries secondary text and takes the non-body floor.
const APCA_FLOOR = { fg: 75, fgMuted: 60 } as const;

// The Lc gap between the two levels on the canvas. Dark affords 12 today:
// `fgMuted` is gray._80 and the ramp has no tone between _70 and _80, so a
// wider gap needs a new gray tone. APCA reads about 15 as clearly distinct.
const MIN_STEP_LC = 12;

const LADDER = ["fg", "fgMuted"] as const;

// Opaque backgrounds the ladder is allowed to sit on. `bgControlBright`,
// `bgInverse` and the coloured Intent tints are excluded: each pairs with its
// own foreground token (`fgOnControlBright`, `fgOnInverse`, `fgInfo`, …).
// `bgNeutralSubtle` stays, because neutral's text is the ladder itself.
const SURFACES = [
  "bgCanvas",
  "bgSurface",
  "bgSurfaceRaised",
  "bgSurfaceSunken",
  "bgControl",
  "bgControlHover",
  "bgControlPressed",
  "bgControlSelected",
  "bgControlDisabled",
  "bgNeutralSubtle",
] as const;

// Every Intent's fill and hover fill carries its `fgOn<Intent>` token
// (primary button, active chip, checked box, danger button, badge). These are
// measured with APCA, not the WCAG 2 ratio: the ratio ignores polarity and
// rates black on a mid-tone purple above white, the opposite of what the eye
// sees. Lc 60 is APCA's floor for 16px semibold, the smallest label a fill
// carries. A hover fill is a transient lift of the same label, so it may drop
// to Lc 50.
const APCA_LABEL_TEXT = 60;
const APCA_HOVER_LABEL_TEXT = 50;

const INTENTS = [
  "neutral",
  "accent",
  "info",
  "success",
  "warning",
  "danger",
] as const;

type Level = (typeof LADDER)[number];
type Surface = (typeof SURFACES)[number];
type Intent = (typeof INTENTS)[number];
// `color` is branded with a unique symbol for opaque typing (see `VarGroup`
// in `@stylexjs/stylex`). This makes `keyof typeof color` pull in
// `Symbol.prototype` members like `toString`, so a dynamic `color[token]`
// read reads as an unbound method to `@typescript-eslint/unbound-method`.
// Every real token starts with `bg`, `fg` or `border`, so this keeps only
// those.
type Token = Extract<
  keyof typeof color,
  `bg${string}` | `fg${string}` | `border${string}`
>;

function capitalise(word: string) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function isToken(key: string): key is Token {
  return key in color;
}

function token(key: string): Token {
  if (!isToken(key)) throw new Error(`Not a token: ${key}`);
  return key;
}

const fillOf = (intent: Intent) => token(`bg${capitalise(intent)}`);
const hoverFillOf = (intent: Intent) => token(`bg${capitalise(intent)}Hover`);
const fgOn = (intent: Intent) => token(`fgOn${capitalise(intent)}`);

const here = path.dirname(fileURLToPath(import.meta.url));
const hueDir = path.join(here, "_generated/palette/hues");
const css = compileStylexCss([
  path.join(here, "tokens.stylex.ts"),
  ...fs
    .readdirSync(hueDir)
    .filter((file) => file.endsWith(".stylex.ts"))
    .map((file) => path.join(hueDir, file)),
]);

// Intent tints are `rgba()` over the canvas, so they are composited before
// measuring; APCA only reads opaque colours.
function overCanvas(value: string, canvas: string) {
  const tint = value.match(/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/);
  if (!tint) return value;
  const alpha = Number(tint[4]);
  const base = hexChannels(canvas);
  const channels = [tint[1], tint[2], tint[3]].map((channel, i) =>
    Math.round(Number(channel) * alpha + base[i] * (1 - alpha)),
  );
  return `#${channels.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

describe.each(["light", "dark"] as const)("%s text ladder", (scheme) => {
  const canvas = readCustomProperty(css, color.bgCanvas)[scheme];
  const resolve = (token: Token) =>
    overCanvas(readCustomProperty(css, color[token])[scheme], canvas);

  it.each(LADDER)(
    "%s clears its floor on every surface it can land on",
    (level: Level) => {
      const text = resolve(level);
      const worst = SURFACES.map((surface: Surface) => ({
        surface,
        lc: apcaContrast(text, resolve(surface)),
      })).sort((a, b) => a.lc - b.lc)[0];

      expect(
        worst.lc,
        `worst pairing is ${worst.surface} at Lc ${worst.lc.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(APCA_FLOOR[level]);
    },
  );

  it("keeps the two levels distinguishable", () => {
    const canvas = resolve("bgCanvas");
    const delta =
      apcaContrast(resolve("fg"), canvas) -
      apcaContrast(resolve("fgMuted"), canvas);
    expect(delta, `fg→fgMuted is only ΔLc ${delta.toFixed(1)}`).toBeGreaterThan(
      MIN_STEP_LC,
    );
  });
});

describe.each(["light", "dark"] as const)("%s intent fills", (scheme) => {
  const resolve = (token: Token) =>
    readCustomProperty(css, color[token])[scheme];

  it.each(INTENTS)(
    "fgOn%s clears its fill and hover fill",
    (intent: Intent) => {
      const on = resolve(fgOn(intent));
      const base = apcaContrast(on, resolve(fillOf(intent)));
      const hover = apcaContrast(on, resolve(hoverFillOf(intent)));
      expect(base, `fill Lc ${base.toFixed(1)}`).toBeGreaterThanOrEqual(
        APCA_LABEL_TEXT,
      );
      expect(hover, `hover Lc ${hover.toFixed(1)}`).toBeGreaterThanOrEqual(
        APCA_HOVER_LABEL_TEXT,
      );
    },
  );
});

// `fg<Intent>` is text in its own right (accent Text, a field error), so it
// takes the body floor on the page. On its tint it carries labels (a Callout
// title, a Badge), so there it takes the label floor. A tint that composites
// to a grey has lost the hue it is there to carry.
const TINTED_INTENTS = [
  "accent",
  "info",
  "success",
  "warning",
  "danger",
] as const;
const INTENT_GROUNDS = [
  "bgCanvas",
  "bgSurface",
  "bgSurfaceRaised",
  "bgSurfaceSunken",
] as const;
const MIN_TINT_CHANNEL_SPREAD = 8;

type TintedIntent = (typeof TINTED_INTENTS)[number];

describe.each(["light", "dark"] as const)("%s intent tints", (scheme) => {
  const resolve = (token: Token) =>
    readCustomProperty(css, color[token])[scheme];
  const fgOf = (intent: TintedIntent) =>
    resolve(token(`fg${capitalise(intent)}`));
  const tintOver = (intent: TintedIntent, ground: Token) =>
    overCanvas(
      resolve(token(`bg${capitalise(intent)}Subtle`)),
      resolve(ground),
    );

  function expectWorstAbove(
    text: string,
    backgroundOn: (ground: Token) => string,
    floor: number,
  ) {
    const worst = INTENT_GROUNDS.map((ground) => ({
      ground,
      lc: apcaContrast(text, backgroundOn(ground)),
    })).sort((a, b) => a.lc - b.lc)[0];
    expect(
      worst.lc,
      `worst ground is ${worst.ground} at Lc ${worst.lc.toFixed(1)}`,
    ).toBeGreaterThanOrEqual(floor);
  }

  it.each(TINTED_INTENTS)(
    "the %s foreground clears the body floor on the page",
    (intent: TintedIntent) => {
      expectWorstAbove(fgOf(intent), resolve, APCA_FLOOR.fg);
    },
  );

  it.each(TINTED_INTENTS)(
    "the %s foreground clears the label floor on its tint",
    (intent: TintedIntent) => {
      expectWorstAbove(
        fgOf(intent),
        (ground) => tintOver(intent, ground),
        APCA_LABEL_TEXT,
      );
    },
  );

  it.each(TINTED_INTENTS)(
    "the %s tint keeps its hue on every ground",
    (intent: TintedIntent) => {
      for (const ground of INTENT_GROUNDS) {
        const channels = hexChannels(tintOver(intent, ground));
        const spread = Math.max(...channels) - Math.min(...channels);
        expect(spread, `${ground} spread`).toBeGreaterThanOrEqual(
          MIN_TINT_CHANNEL_SPREAD,
        );
      }
    },
  );
});

// `borderControl` is the only sign of an unselected control: an empty checkbox
// or radio, the track and thumb of an off switch, a text field's edge. WCAG
// 1.4.11 holds it to 3:1 against every surface a control sits on, and against
// the fill it surrounds. `bgControlHover` is here because an option card
// hovers under its selection mark.
const NON_TEXT_RATIO = 3;

const CONTROL_GROUNDS = [
  "bgCanvas",
  "bgSurface",
  "bgSurfaceSunken",
  "bgSurfaceRaised",
  "bgControl",
  "bgControlHover",
] as const;

describe.each(["light", "dark"] as const)("%s control boundary", (scheme) => {
  const resolve = (token: Token) =>
    readCustomProperty(css, color[token])[scheme];

  it.each(CONTROL_GROUNDS)("borderControl clears 3:1 against %s", (ground) => {
    const ratio = contrastRatio(resolve("borderControl"), resolve(ground));
    expect(ratio, `ratio ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(
      NON_TEXT_RATIO,
    );
  });
});

// The scrim is translucent and can dim media, so its text is measured over
// white, the brightest ground it can sit on. Scrim text includes captions, so
// it holds the body floor.
describe.each(["light", "dark"] as const)("%s scrim", (scheme) => {
  const resolve = (token: Token) =>
    readCustomProperty(css, color[token])[scheme];

  it("fgOnScrim clears the scrim over white", () => {
    const scrim = overCanvas(resolve("bgScrim"), "#ffffff");
    const lc = apcaContrast(resolve("fgOnScrim"), scrim);
    expect(lc, `Lc ${lc.toFixed(1)}`).toBeGreaterThanOrEqual(APCA_FLOOR.fg);
  });
});
