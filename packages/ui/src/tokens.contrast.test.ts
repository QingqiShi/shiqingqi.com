import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileStylexCss, readCustomProperty } from "@tuja/stylex-testing";
import { describe, expect, it } from "vitest";
import { apcaContrast } from "./test-support/apca-contrast.ts";
import { hexChannels } from "./test-support/hex-channels.ts";
import { color } from "./tokens.stylex.ts";

// Guards the text ladder against the two ways it can rot: a level drifting
// under its APCA floor on a surface it lands on, and the two levels drifting
// together until they stop reading as separate levels.
//
// `textMain` carries body copy, so it takes APCA's 16px body floor; `textMuted`
// carries secondary text and takes the non-body floor.
const APCA_FLOOR = { textMain: 75, textMuted: 60 } as const;

// The Lc gap between the two levels on the canvas. Dark affords 12 today:
// `textMuted` is gray._80 and the ramp has no tone between _70 and _80, so a
// wider gap needs a new gray tone. APCA reads about 15 as clearly distinct.
const MIN_STEP_LC = 12;

const LADDER = ["textMain", "textMuted"] as const;

// Opaque backgrounds the ladder is allowed to sit on. `bgSurfaceBright`,
// `bgInverse` and the intent tints are excluded: they pair with their own
// foreground token (`textOnBright`, `textOnInverse`, `infoText`, …).
const SURFACES = [
  "bgCanvas",
  "bgCanvasSubtle",
  "bgSurface",
  "bgSurfaceRaised",
  "bgSurfaceSunken",
  "bgOverlay",
  "bgInteractiveRest",
  "bgInteractiveHover",
  "bgInteractivePressed",
  "bgInteractiveSelected",
  "bgInteractiveDisabled",
  "surfaceNeutralSubtle",
] as const;

// Every intent's Base and Hover fill carries its `<intent>On` token (primary
// button, active chip, checked box, danger button, badge). These are measured
// with APCA, not the WCAG 2 ratio: the ratio ignores polarity and rates black
// on a mid-tone purple above white, the opposite of what the eye sees. Lc 60
// is APCA's floor for 16px semibold, the smallest label a fill carries. A
// Hover fill is a transient lift of the same label, so it may drop to Lc 50.
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

type TextRole = (typeof LADDER)[number];
type Surface = (typeof SURFACES)[number];
type Intent = (typeof INTENTS)[number];
type Token =
  | TextRole
  | Surface
  | Intent
  | `${Intent}Hover`
  | `${Intent}On`
  | "textOnScrim"
  | "bgScrim";

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
  const tint = value.match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
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
    (role: TextRole) => {
      const text = resolve(role);
      const worst = SURFACES.map((surface: Surface) => ({
        surface,
        lc: apcaContrast(text, resolve(surface)),
      })).sort((a, b) => a.lc - b.lc)[0];

      expect(
        worst.lc,
        `worst pairing is ${worst.surface} at Lc ${worst.lc.toFixed(1)}`,
      ).toBeGreaterThanOrEqual(APCA_FLOOR[role]);
    },
  );

  it("keeps the two levels distinguishable", () => {
    const canvas = resolve("bgCanvas");
    const delta =
      apcaContrast(resolve("textMain"), canvas) -
      apcaContrast(resolve("textMuted"), canvas);
    expect(
      delta,
      `textMain→textMuted is only ΔLc ${delta.toFixed(1)}`,
    ).toBeGreaterThan(MIN_STEP_LC);
  });
});

describe.each(["light", "dark"] as const)("%s intent fills", (scheme) => {
  const resolve = (token: Token) =>
    readCustomProperty(css, color[token])[scheme];

  it.each(INTENTS)("%sOn clears its Base and Hover fills", (intent: Intent) => {
    const on = resolve(`${intent}On`);
    const base = apcaContrast(on, resolve(intent));
    const hover = apcaContrast(on, resolve(`${intent}Hover`));
    expect(base, `Base Lc ${base.toFixed(1)}`).toBeGreaterThanOrEqual(
      APCA_LABEL_TEXT,
    );
    expect(hover, `Hover Lc ${hover.toFixed(1)}`).toBeGreaterThanOrEqual(
      APCA_HOVER_LABEL_TEXT,
    );
  });
});

// The scrim is translucent and can dim media, so its text is measured over
// white, the brightest ground it can sit on. Scrim text includes captions, so
// it holds the body floor.
describe.each(["light", "dark"] as const)("%s scrim", (scheme) => {
  const resolve = (token: Token) =>
    readCustomProperty(css, color[token])[scheme];

  it("textOnScrim clears the scrim over white", () => {
    const scrim = overCanvas(resolve("bgScrim"), "#ffffff");
    const lc = apcaContrast(resolve("textOnScrim"), scrim);
    expect(lc, `Lc ${lc.toFixed(1)}`).toBeGreaterThanOrEqual(
      APCA_FLOOR.textMain,
    );
  });
});
