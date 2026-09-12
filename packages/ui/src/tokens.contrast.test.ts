import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileStylexCss, readCustomProperty } from "@tuja/stylex-testing";
import { describe, expect, it } from "vitest";
import { gray } from "./_generated/palette/hues/gray.stylex.ts";
import { apcaContrast } from "./test-support/apca-contrast.ts";
import { color } from "./tokens.stylex.ts";

// Guards the text ladder against the two ways it can rot: a level drifting
// under its APCA floor on a surface it lands on, and the two levels drifting
// together until they stop reading as separate levels.
//
// `textMain` carries body copy, so it takes APCA's 16px body floor; `textMuted`
// carries secondary text and takes the non-body floor.
const APCA_FLOOR = { textMain: 75, textMuted: 60 } as const;

// The quietest step either theme currently affords, measured as the Lc gap
// between the two levels on the canvas. Not a spec number — it is a floor
// under the current design so a future tone swap has to be deliberate.
const MIN_STEP_LC = 9;

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

// The smallest Base→Hover lift either theme currently has, so a retune cannot
// leave a hover state that looks like rest. A floor under the current design,
// not a spec number.
const MIN_HOVER_STEP_LC = 7;

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
type Token = TextRole | Surface | Intent | `${Intent}Hover` | `${Intent}On`;

const here = path.dirname(fileURLToPath(import.meta.url));
const hueDir = path.join(here, "_generated/palette/hues");
const css = compileStylexCss([
  path.join(here, "tokens.stylex.ts"),
  ...fs
    .readdirSync(hueDir)
    .filter((file) => file.endsWith(".stylex.ts"))
    .map((file) => path.join(hueDir, file)),
]);

describe.each(["light", "dark"] as const)("%s text ladder", (scheme) => {
  const resolve = (token: Token) =>
    readCustomProperty(css, color[token])[scheme];

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

  // `<intent>On` is derived, not tuned: white or black, whichever reads better
  // on the weaker of the two fills it has to sit on.
  it.each(INTENTS)(
    "%sOn is the better of white and black",
    (intent: Intent) => {
      const fills = [resolve(intent), resolve(`${intent}Hover`)];
      const weakest = (on: string) =>
        Math.min(...fills.map((fill) => apcaContrast(on, fill)));
      const expected =
        weakest(gray._100) >= weakest(gray._0) ? gray._100 : gray._0;
      expect(resolve(`${intent}On`).toUpperCase()).toBe(expected.toUpperCase());
    },
  );

  it.each(INTENTS)("%s lifts visibly on hover", (intent: Intent) => {
    const step = apcaContrast(resolve(`${intent}Hover`), resolve(intent));
    expect(step, `Base→Hover is only ΔLc ${step.toFixed(1)}`).toBeGreaterThan(
      MIN_HOVER_STEP_LC,
    );
  });
});
