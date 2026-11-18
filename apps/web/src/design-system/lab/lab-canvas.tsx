"use client";

import * as stylex from "@stylexjs/stylex";
import { useLocale } from "@tuja/i18n/use-locale";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { useFlowChange } from "@tuja/ui/hooks/use-flow-change";
import { fill } from "@tuja/ui/primitives/layout.stylex";
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from "react";
import { buildLabSnippet } from "./build-lab-snippet.ts";
import { labBar } from "./lab-bar.stylex.ts";
import { LabBar } from "./lab-bar.tsx";
import { LabControls } from "./lab-controls.tsx";
import { type LabAction, labReducer } from "./lab-reducer.ts";
import { LabScene } from "./lab-scene.tsx";
import { LabSnippet } from "./lab-snippet.tsx";
import { labStage } from "./lab-stage.stylex.ts";
import { labWidth } from "./lab-width.stylex.ts";
import { renderSpecimen } from "./render-specimen.tsx";
import { resolveLabModel } from "./resolve-lab-model.ts";
import type { LabConfig, LabControlModel, LabProps } from "./types.ts";
import { useKeyboardArea } from "./use-keyboard-area.ts";

interface LabCanvasProps<P> {
  config: LabConfig<P>;
}

/** Room for a control panel: eighteen characters of label plus its control. */
const PANEL_INLINE_SIZE = "18rem";

// Derived from the container query so the JS check cannot drift from the
// style one.
const PANEL_BESIDE_MIN_REM = Number.parseFloat(
  labWidth.panelBeside.split(">=")[1] ?? "",
);

/**
 * The Lab's main region: the page body itself, carrying a Texture, with the
 * Specimen centred on it and its code beneath. It owns the Lab's state, so the
 * controls panel and the bar both drive the one Specimen.
 */
export function LabCanvas<P>({ config }: LabCanvasProps<P>) {
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  // `false` on the server and through hydration, so the bar mounts only once
  // the client has measured a Lab too narrow for the panel beside the stage.
  const [isCompact, setIsCompact] = useState(false);
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

  const flow = useFlowChange();
  const run = (next: LabAction) => {
    flow(() => {
      dispatch(withReplaced(next, model.controls));
    });
  };

  useLayoutEffect(() => {
    const container = containerRef.current;
    const stage = stageRef.current;
    if (!container || !stage || typeof ResizeObserver === "undefined") return;
    let isStale = false;
    const measure = () => {
      if (isStale) return;
      const { width } = container.getBoundingClientRect();
      if (width === 0) return;
      const rem = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const isNarrow = width < PANEL_BESIDE_MIN_REM * rem;
      setIsCompact(isNarrow);
      // With the bar, the stage fills what the chrome above it leaves of the
      // first screen, and the header's height at this width is known only
      // once the page is laid out.
      if (isNarrow) setStageBlockStart(pageBlockStartOf(stage));
    };
    measure();
    // The header wraps again when the Lab gets a new width, and the sidebar
    // gives it one without a resize of the window.
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    // The header is set in a web font, so its height settles only once that
    // font arrives.
    void document.fonts.ready.then(measure);
    return () => {
      isStale = true;
      observer.disconnect();
    };
  }, []);

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

  const { state: binding } = config;
  const setBound = (next: unknown) => {
    if (binding === undefined) return;
    run({ type: "setProp", prop: String(binding.prop), value: next });
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
    <div ref={containerRef} css={styles.container}>
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
            <FlowBlock
              anchor="center"
              css={[styles.specimen, config.scene !== undefined && fill.inline]}
            >
              {binding?.trigger}
              {config.scene === undefined ? (
                renderSpecimen(config, specimenProps)
              ) : (
                <LabScene kind={config.scene}>
                  {renderSpecimen(config, specimenProps)}
                </LabScene>
              )}
            </FlowBlock>
          </div>
          <div css={styles.snippet}>
            <LabSnippet snippet={snippet} />
          </div>
        </div>
        <LabControls
          variants={model.variants}
          controls={model.controls}
          state={state}
          dispatch={run}
        />
      </div>
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

/**
 * How far the element stands from the top of the page. While a motion of the
 * page plays, `getBoundingClientRect` includes the transform that the motion
 * gives the element, so the layout offsets give the distance then. They are
 * whole pixels, so at rest the rect gives it.
 */
function pageBlockStartOf(element: HTMLElement) {
  let inLayout = element.offsetTop;
  let parent = element.offsetParent;
  while (parent instanceof HTMLElement) {
    inLayout += parent.offsetTop + parent.clientTop;
    parent = parent.offsetParent;
  }
  const onScreen = element.getBoundingClientRect().top + window.scrollY;
  return Math.abs(onScreen - inLayout) < 1 ? onScreen : inLayout;
}

/**
 * A value for a prop that `replaces` others leaves them out, so the Specimen
 * never takes two props that the component takes one of. A sample with no
 * value leaves the prop out, and so keeps the others.
 */
function withReplaced(
  action: LabAction,
  controls: readonly LabControlModel[],
): LabAction {
  if (action.type !== "setProp") return action;
  const control = controls.find(({ name }) => name === action.prop);
  if (control?.replaces === undefined) return action;
  const value =
    control.samples === undefined
      ? action.value
      : control.samples.find(({ id }) => id === action.value)?.value;
  return value === undefined
    ? action
    : { ...action, replaces: control.replaces };
}

const styles = stylex.create({
  // The Lab lays out by the width of this box, which the sidebar beside the
  // page changes while the screen keeps its width.
  container: {
    containerName: "lab",
    containerType: "inline-size",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
  canvas: {
    [textureTokens.pitch]: space._4,
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [labWidth.panelBeside]: `minmax(0, 1fr) ${PANEL_INLINE_SIZE}`,
    },
    gap: rhythm.group,
    paddingBlockStart: space._4,
    // Room under the snippet for the bar the Lab fixes to the foot of the
    // viewport. The shell's own padding below the page (`space._8` and the
    // safe area) counts towards it, so the bar alone gives the page no scroll.
    // From `md` the bar is in the flow under the Canvas, and takes its own
    // room.
    paddingBlockEnd: {
      default: `calc(${labBar.clearance} + ${space._4} - ${space._8} - env(safe-area-inset-bottom))`,
      [breakpoints.md]: space._4,
    },
    // With the panel beside the stage, the Canvas takes what the header
    // leaves of the viewport, so the page does not scroll. The floor keeps
    // room for the Specimen in a short window, and the page scrolls there.
    // With the bar, the stage sizes itself to the screen instead.
    flexGrow: { default: 0, [labWidth.panelBeside]: 1 },
    minBlockSize: { default: null, [labWidth.panelBeside]: "20rem" },
  },
  stage: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: rhythm.group,
    minInlineSize: 0,
    // With the bar, the stage takes the first screen, to a step above the
    // bar, so the snippet shows without a scroll and the Specimen centres in
    // the room it leaves.
    minBlockSize: {
      default: `calc(100dvh - ${labStage.blockStart} - ${labBar.clearance} - ${space._4})`,
      [labWidth.panelBeside]: "auto",
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
    flexGrow: 1,
  },
  // The cap makes a Specimen that is wider than a phone shrink to the stage.
  // Without it, the Specimen keeps its width and the stage cuts both sides.
  specimen: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    maxInlineSize: "100%",
    minInlineSize: 0,
  },
  // With the panel beside the stage, the snippet stands at the foot of the
  // stage and takes the room that the Specimen leaves. Its basis is the least
  // room it keeps, so long code scrolls in its card and does not make the
  // page scroll.
  snippet: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    flexGrow: { default: 0, [labWidth.panelBeside]: 1 },
    flexShrink: { default: 0, [labWidth.panelBeside]: 1 },
    flexBasis: { default: "auto", [labWidth.panelBeside]: "12rem" },
    minBlockSize: { default: "auto", [labWidth.panelBeside]: 0 },
    inlineSize: "100%",
    maxInlineSize: "34rem",
    minInlineSize: 0,
  },
});
