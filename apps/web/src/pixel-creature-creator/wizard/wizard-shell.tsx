"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints, pointer } from "@tuja/ui/breakpoints.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { selected, selectedTokens } from "@tuja/ui/primitives/selected.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole, typeModifier } from "@tuja/ui/primitives/type.stylex";
import { color, font, opacity, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useMemo, useReducer, useRef } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import {
  type CreatureDef,
  DEFAULT_CREATURE,
} from "#src/pixel-creature-creator/creature/creature-def-schema.ts";
import { decodeCreature } from "#src/pixel-creature-creator/creature/decode-creature.ts";
import { encodeCreature } from "#src/pixel-creature-creator/creature/encode-creature.ts";
import { useLocationHash } from "#src/pixel-creature-creator/creature/use-location-hash.ts";
import { PixelSprite } from "#src/pixel-creature-creator/sprite/pixel-sprite.tsx";
import { randomCreature } from "./random-creature";
import { StepFeatures } from "./step-features";
import { StepName } from "./step-name";
import { StepSpecies } from "./step-species";
import { StepVibe } from "./step-vibe";
import {
  type WizardStep,
  WIZARD_STEPS,
  createInitialWizardState,
  wizardReducer,
} from "./wizard-reducer";

/**
 * Wizard host. Renders a persistent live preview alongside the active step
 * content, plus a top breadcrumb and a back/next bar at the bottom.
 *
 * State sources:
 *  - `DEFAULT_CREATURE` seeds the reducer.
 *  - URL hash on mount: if the page was opened via an edit deep-link,
 *    swap the initial def for the decoded one and unlock all steps.
 *  - Otherwise, replace the initial def with a fresh random creature so
 *    the user lands on something that already looks alive.
 */
export function WizardShell() {
  const [state, dispatch] = useReducer(
    wizardReducer,
    DEFAULT_CREATURE,
    createInitialWizardState,
  );
  // Plain refs (not state) — we only need to remember these flags across
  // renders. Setting state inside an effect would trigger the
  // `react-hooks/set-state-in-effect` lint rule and add a pointless extra
  // render; refs are cheaper and convey the same intent.
  //  - `initializedRef`: whether we've replaced the seed with a random
  //    creature on the first render. Fires regardless of hash presence.
  //  - `bootstrappedRef`: whether we've consumed a non-empty hash. Only
  //    flips to `true` after a successful or failed deep-link decode, so a
  //    later hashchange arriving with a real fragment can still bootstrap.
  const initializedRef = useRef(false);
  const bootstrappedRef = useRef(false);
  const locale = useLocale();
  // Subscribe to `hashchange` via `useLocationHash` so back/forward
  // navigation (or a paste into the URL bar) can still trigger the initial
  // bootstrap when the user lands on the wizard before the fragment is in
  // place. Once a hash has been consumed, subsequent changes are ignored —
  // re-seeding mid-edit would clobber the user's in-progress choices.
  const rawHash = useLocationHash();

  useEffect(() => {
    if (bootstrappedRef.current) return;
    // The hash is the only place we accept a deep-link def for the wizard;
    // `useSearchParams` is a query-string hook and never sees the fragment.
    const stripped = rawHash.replace(/^#/, "");
    if (stripped.length === 0) {
      // No hash yet. Randomize the live preview once so first-mount looks
      // alive, but stay un-bootstrapped so a later hashchange can still
      // deep-link the wizard into edit mode.
      if (!initializedRef.current) {
        initializedRef.current = true;
        dispatch({ type: "RESET", def: randomCreature() });
      }
      return;
    }
    bootstrappedRef.current = true;
    initializedRef.current = true;
    const decoded = decodeCreature(stripped);
    if (decoded !== null) {
      // Seed every step as visited so the user can jump directly to the
      // choice they want to tweak.
      dispatch({ type: "BOOTSTRAP_DEEP_LINK", def: decoded });
    } else {
      // Hash present but undecodable — fall back to a random preview and
      // mark bootstrapped so we don't keep re-randomizing on every render.
      dispatch({ type: "RESET", def: randomCreature() });
    }
  }, [rawHash]);

  const handleStepChange = (next: CreatureDef) => {
    dispatch({ type: "SET_DEF", def: next });
  };

  const handleShuffle = () => {
    dispatch({ type: "SHUFFLE", def: randomCreature() });
  };

  const handleFinish = () => {
    // Trim whitespace on submit — the input lets the user type spaces
    // mid-edit but the encoded URL should not contain stray padding.
    const trimmed: CreatureDef = { ...state.def, name: state.def.name.trim() };
    const encoded = encodeCreature(trimmed);
    const localePrefix = locale === "en" ? "/en" : "/zh";
    // Use a full navigation (not `router.push`) so the new route mounts
    // fresh with the hash already in `window.location.hash` — Next.js soft
    // routing intermittently drops the URL fragment when the route only
    // differs by hash, which made the review stub fall back to the
    // "invalid link" branch in tests.
    window.location.assign(
      `${localePrefix}/pixel-creature-creator/c#${encoded}`,
    );
  };

  const stepLabels: Record<WizardStep, string> = {
    1: t({ en: "Species", zh: "物种" }),
    2: t({ en: "Features", zh: "特征" }),
    3: t({ en: "Vibe", zh: "气质" }),
    4: t({ en: "Name", zh: "命名" }),
  };

  const stepContent = useMemo(() => {
    switch (state.step) {
      case 1:
        return <StepSpecies def={state.def} onChange={handleStepChange} />;
      case 2:
        return <StepFeatures def={state.def} onChange={handleStepChange} />;
      case 3:
        return <StepVibe def={state.def} onChange={handleStepChange} />;
      case 4:
        return <StepName def={state.def} onChange={handleStepChange} />;
      default:
        return null;
    }
    // `handleStepChange` closes over the stable dispatch from useReducer;
    // omit it from deps so the memo only recomputes on actual state change.
  }, [state.def, state.step]);

  const finishLabel = t({ en: "Finish", zh: "完成" });
  const nextLabel = t({ en: "Next", zh: "下一步" });
  const backLabel = t({ en: "Back", zh: "返回" });
  const shuffleLabel = t({ en: "Shuffle all", zh: "随机生成" });
  const isLastStep = state.step === 4;
  const nameTooShort = isLastStep && state.def.name.trim().length === 0;
  const previewLabel = t({ en: "Live preview", zh: "实时预览" });

  return (
    <div css={[stack.item, styles.root]} data-testid="wizard-shell">
      <header css={[row.item, styles.topBar]}>
        <h2 css={[typeRole.h2, styles.title]}>
          {t({ en: "Pixel Creature Creator", zh: "像素生物创造器" })}
        </h2>
        <button
          type="button"
          onClick={handleShuffle}
          data-testid="wizard-shuffle"
          css={[
            buttonReset.base,
            typeRole.label,
            corner.radius_round,
            styles.shuffleBtn,
            transition.colors,
          ]}
        >
          {shuffleLabel}
        </button>
      </header>

      <nav
        css={cluster.tight}
        aria-label={t({ en: "Wizard steps", zh: "向导步骤" })}
      >
        {WIZARD_STEPS.map((stepNumber) => {
          const isActive = state.step === stepNumber;
          const isVisited = state.visitedSteps.has(stepNumber);
          return (
            <button
              key={stepNumber}
              type="button"
              disabled={!isVisited}
              aria-current={isActive ? "step" : undefined}
              onClick={() => {
                dispatch({ type: "GOTO_STEP", step: stepNumber });
              }}
              data-testid={`wizard-pill-${String(stepNumber)}`}
              css={[
                buttonReset.base,
                typeRole.label,
                corner.radius_round,
                styles.pill,
                selected.quiet,
                transition.colors,
                !isVisited && styles.pillLocked,
              ]}
            >
              <span css={[typeModifier.numeric, styles.pillNumber]}>
                {String(stepNumber)}
              </span>
              <span css={styles.pillLabel}>{stepLabels[stepNumber]}</span>
            </button>
          );
        })}
      </nav>

      <div css={styles.body}>
        <aside
          css={[corner.radius_3, styles.preview]}
          data-testid="wizard-preview"
        >
          <span css={[typeRole.overline, styles.previewLabel]}>
            {previewLabel}
          </span>
          <div css={styles.previewStage}>
            <PixelSprite def={state.def} scale={8} aria-label={previewLabel} />
          </div>
        </aside>

        <main css={styles.stepHost}>{stepContent}</main>
      </div>

      <footer css={styles.footer}>
        <button
          type="button"
          onClick={() => {
            dispatch({ type: "BACK" });
          }}
          disabled={state.step === 1}
          data-testid="wizard-back"
          css={[
            buttonReset.base,
            typeRole.body,
            styles.footerBtn,
            transition.colors,
            styles.footerBtnSecondary,
          ]}
        >
          {backLabel}
        </button>
        <button
          type="button"
          onClick={() => {
            if (isLastStep) {
              handleFinish();
            } else {
              dispatch({ type: "NEXT" });
            }
          }}
          disabled={nameTooShort}
          data-testid={isLastStep ? "wizard-finish" : "wizard-next"}
          css={[
            buttonReset.base,
            typeRole.body,
            styles.footerBtn,
            transition.colors,
            styles.footerBtnPrimary,
          ]}
        >
          {isLastStep ? finishLabel : nextLabel}
        </button>
      </footer>
    </div>
  );
}

const styles = stylex.create({
  root: {
    padding: space._3,
    paddingTop: `calc(${space._10} + env(safe-area-inset-top))`,
    paddingBottom: `calc(${space._3} + env(safe-area-inset-bottom))`,
    maxInlineSize: "1140px",
    marginInline: "auto",
    minHeight: "100dvh",
    boxSizing: "border-box",
  },
  topBar: {
    justifyContent: "space-between",
  },
  title: {
    margin: 0,
    color: color.fg,
  },
  shuffleBtn: {
    paddingBlock: space._1,
    paddingInline: space._3,
    backgroundColor: {
      default: color.bgSurface,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
    color: color.fg,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: color.border,
  },
  pill: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.inline,
    paddingBlock: space._1,
    paddingInline: space._2,
    [selectedTokens.rest]: color.bgSurface,
    color: color.fgMuted,
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "transparent",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": opacity.disabled },
  },
  pillLocked: {
    // The disabled visuals come from the pseudo on `pill`; this class
    // exists so the pill can also pick up locked-only treatments later
    // (e.g. an aria attribute) without bleeding into the active state.
  },
  pillNumber: {
    fontWeight: font.weight_6,
  },
  pillLabel: {
    display: { default: "none", [breakpoints.md]: "inline" },
  },
  body: {
    display: "flex",
    flexDirection: { default: "column", [breakpoints.md]: "row" },
    alignItems: { default: "stretch", [breakpoints.md]: "flex-start" },
    gap: rhythm.item,
  },
  preview: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: rhythm.tight,
    padding: space._3,
    backgroundColor: color.bgSurface,
    position: { default: "static", [breakpoints.md]: "sticky" },
    top: { default: "auto", [breakpoints.md]: space._3 },
    flexShrink: { default: 1, [breakpoints.md]: 0 },
    width: { default: "auto", [breakpoints.md]: "320px" },
  },
  previewLabel: {
    color: color.fgMuted,
  },
  previewStage: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "192px",
  },
  stepHost: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    gap: rhythm.tight,
    paddingTop: space._2,
    borderTopWidth: "1px",
    borderTopStyle: "solid",
    borderTopColor: color.border,
  },
  footerBtn: {
    paddingBlock: space._2,
    paddingInline: space._4,
    borderRadius: "10px",
    cornerShape: "squircle",
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": opacity.disabled },
    borderWidth: "1px",
    borderStyle: "solid",
    fontWeight: font.weight_6,
  },
  footerBtnSecondary: {
    backgroundColor: {
      default: color.bgSurface,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
    color: color.fg,
    borderColor: color.border,
  },
  footerBtnPrimary: {
    backgroundColor: {
      default: color.bgAccent,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgAccentHover,
      },
    },
    color: color.fgOnAccent,
    borderColor: color.borderAccent,
  },
});
