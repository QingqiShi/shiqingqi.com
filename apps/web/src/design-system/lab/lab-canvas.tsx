"use client";

import * as stylex from "@stylexjs/stylex";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { useMediaQuery } from "@tuja/ui/hooks/use-media-query";
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  startTransition,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { ViewTransition } from "react";
import { labMorph } from "#src/view-transition-classes.stylex.ts";
import { buildLabSnippet } from "./build-lab-snippet.ts";
import { labBar } from "./lab-bar.stylex.ts";
import { LabBar } from "./lab-bar.tsx";
import { LabControls } from "./lab-controls.tsx";
import { type LabAction, labReducer } from "./lab-reducer.ts";
import { LabSnippet } from "./lab-snippet.tsx";
import { labStage } from "./lab-stage.stylex.ts";
import { renderSpecimen } from "./render-specimen.tsx";
import { resolveLabModel } from "./resolve-lab-model.ts";
import type { LabConfig, LabProps } from "./types.ts";
import { useKeyboardArea } from "./use-keyboard-area.ts";

interface LabCanvasProps<P> {
  config: LabConfig<P>;
}

/** Room for a control panel: eighteen characters of label plus its control. */
const PANEL_INLINE_SIZE = "18rem";

// Derived from the breakpoint token so the JS check cannot drift from the
// style one. `matchMedia` needs the bare condition; the StyleX const carries
// the `@media ` prefix.
const MD_MEDIA_QUERY = breakpoints.md.replace("@media ", "");

/**
 * The Lab's main region: the page body itself, carrying a Texture, with the
 * Specimen centred on it and its code beneath. It owns the Lab's state, so the
 * controls panel and the mobile bar both drive the one Specimen.
 */
export function LabCanvas<P>({ config }: LabCanvasProps<P>) {
  const locale = useLocale();
  // `true` on the server and through hydration, so the bar mounts only once
  // the client has measured a viewport narrower than `md`.
  const isCompact = !useMediaQuery(MD_MEDIA_QUERY, true);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageBlockStart, setStageBlockStart] = useState<number | null>(null);
  const area = useKeyboardArea();
  const model = resolveLabModel(config, locale);

  const reduce = labReducer(config.variants);
  const [state, dispatch] = useReducer(
    reduce,
    config.variants[0],
    (variant) => ({
      variantId: variant.id,
      props: { ...variant.props },
    }),
  );

  // A View Transition captures the whole page, and Safari shows a blank page
  // while it runs. One per keystroke or slider step makes input slow and
  // makes the page flash, so only a change that is complete animates.
  const run = (action: LabAction) => {
    if (action.type === "setProp" && action.isLive === true) {
      dispatch(action);
      return;
    }
    startTransition(() => {
      dispatch(action);
    });
  };

  // The stage fills what the chrome above it leaves of the first screen, and
  // the header's height at this width is known only once the page is laid out.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!isCompact || !stage) return;
    let isStale = false;
    const measure = () => {
      if (isStale) return;
      const blockStart = stage.getBoundingClientRect().top + window.scrollY;
      setStageBlockStart(blockStart);
    };
    measure();
    window.addEventListener("resize", measure);
    // The header is set in a web font, so its height settles only once that
    // font arrives.
    void document.fonts.ready.then(measure);
    return () => {
      isStale = true;
      window.removeEventListener("resize", measure);
    };
  }, [isCompact]);

  // An on-screen keyboard covers the foot of the screen, and the browser
  // scrolls the bar's field above it, which takes the Specimen off the top.
  // While it shows, the stage starts where the visible area does and takes
  // what is left of it above the bar.
  const keyboardArea =
    isCompact && area !== null && stageBlockStart !== null ? area : null;

  // A sample-driven prop holds the sample's id, which is what the snippet and
  // the controls read. The Specimen needs the node the id stands for.
  const specimenProps: LabProps = { ...state.props };
  for (const control of model.controls) {
    if (control.samples === undefined) continue;
    const sample = control.samples.find(
      (choice) => choice.id === state.props[control.name],
    );
    specimenProps[control.name] = sample?.value;
  }

  // A change from the Specimen is a live step, so that it does not start a
  // View Transition. A drag on a Slider, for example, sets the value at each
  // step.
  const { state: binding } = config;
  const setBound = (next: unknown) => {
    if (binding === undefined) return;
    run({
      type: "setProp",
      prop: String(binding.prop),
      value: next,
      isLive: true,
    });
  };
  if (binding !== undefined) {
    const { nextValue } = binding;
    specimenProps[String(binding.handler)] =
      nextValue === undefined
        ? setBound
        : () => {
            setBound(nextValue);
          };
  }
  const setter = binding?.setter;
  useEffect(() => setter?.connect(setBound));

  const snippet = buildLabSnippet({
    element: config.doc.component,
    importPath: `@tuja/ui/components/${config.doc.name}`,
    props: state.props,
    docs: config.doc.props,
    controls: model.controls,
    state:
      binding === undefined
        ? undefined
        : {
            prop: String(binding.prop),
            handler: String(binding.handler),
            type: binding.type,
            nextValue: binding.nextValue,
            trigger: binding.trigger,
          },
  });

  return (
    <div css={[texture.dot, styles.canvas]}>
      <div
        ref={stageRef}
        css={[
          styles.stage,
          stageBlockStart !== null &&
            styles.stageBlockStart(`${String(stageBlockStart)}px`),
          keyboardArea !== null &&
            stageBlockStart !== null &&
            styles.stageAboveKeyboard(
              `${String(Math.max(0, keyboardArea.top - stageBlockStart))}px`,
              `${String(keyboardArea.height)}px`,
            ),
        ]}
      >
        <div css={styles.specimenArea}>
          <ViewTransition name="lab-specimen" default={labMorph}>
            <div css={styles.specimen}>
              {binding?.trigger}
              {renderSpecimen(config, specimenProps)}
            </div>
          </ViewTransition>
        </div>
        {/* A Specimen can contain a Disclosure. When it opens, the snippet moves. */}
        <FlowBlock css={styles.snippet}>
          <LabSnippet snippet={snippet} />
        </FlowBlock>
      </div>
      <LabControls
        variants={model.variants}
        controls={model.controls}
        state={state}
        dispatch={run}
      />
      {isCompact && (
        <LabBar
          variants={model.variants}
          controls={model.controls}
          state={state}
          dispatch={run}
        />
      )}
    </div>
  );
}

const styles = stylex.create({
  canvas: {
    [textureTokens.pitch]: space._4,
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.md]: `minmax(0, 1fr) ${PANEL_INLINE_SIZE}`,
    },
    gap: rhythm.group,
    paddingBlockStart: space._4,
    // Room under the snippet for the bar the Lab fixes to the foot of the
    // viewport. The shell's own padding below the page (`space._8` and the
    // safe area) counts towards it, so the bar alone gives the page no scroll.
    paddingBlockEnd: {
      default: `calc(${labBar.clearance} + ${space._4} - ${space._8} - env(safe-area-inset-bottom))`,
      [breakpoints.md]: space._4,
    },
    // The Canvas is the page below the header, so it runs to the foot of the
    // viewport: what stands outside it is the shell's padding above and below.
    // Below `md` the stage sizes itself to the screen instead.
    minBlockSize: {
      default: null,
      [breakpoints.md]: `max(28rem, calc(100dvh - ${space._7} - ${space._4} - ${space._8}))`,
    },
  },
  stage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.group,
    minInlineSize: 0,
    // Below `md` the stage takes the first screen, to a step above the bar, so
    // the snippet shows without a scroll and the Specimen centres in the room
    // it leaves.
    minBlockSize: {
      default: `calc(100dvh - ${labStage.blockStart} - ${labBar.clearance} - ${space._4})`,
      [breakpoints.md]: null,
    },
  },
  stageBlockStart: (blockStart: string) => ({
    [labStage.blockStart]: blockStart,
  }),
  stageAboveKeyboard: (offset: string, visibleHeight: string) => ({
    paddingBlockStart: offset,
    minBlockSize: `calc(${offset} + ${visibleHeight} - ${labBar.clearance} - ${space._4})`,
  }),
  specimenArea: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    minInlineSize: 0,
    flexGrow: { default: 1, [breakpoints.md]: 0 },
  },
  specimen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  snippet: {
    inlineSize: "100%",
    maxInlineSize: "34rem",
    minInlineSize: 0,
  },
});
