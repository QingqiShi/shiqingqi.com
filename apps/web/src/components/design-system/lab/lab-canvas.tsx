"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { texture, textureTokens } from "@tuja/ui/primitives/texture.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import {
  startTransition,
  useCallback,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { ViewTransition } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { useMediaQuery } from "#src/hooks/use-media-query.ts";
import { buildLabSnippet } from "./build-lab-snippet.ts";
import { labBar } from "./lab-bar.stylex.ts";
import { LabBar } from "./lab-bar.tsx";
import { LabControls } from "./lab-controls.tsx";
import { type LabAction, labReducer } from "./lab-reducer.ts";
import { LabSnippet } from "./lab-snippet.tsx";
import { resolveLabModel } from "./resolve-lab-model.ts";
import type { LabConfig, LabProps } from "./types.ts";

interface LabCanvasProps<P> {
  config: LabConfig<P>;
}

/** Room for a control panel: eighteen characters of label plus its control. */
const PANEL_INLINE_SIZE = "18rem";

// Derived from the breakpoint token so the JS check cannot drift from the
// style one. `matchMedia` needs the bare condition; the StyleX const carries
// the `@media ` prefix.
const MD_MEDIA_QUERY = breakpoints.md.replace("@media ", "");

/** How far the stage stands from the top of the page, measured at runtime. */
const STAGE_BLOCK_START = "--lab-stage-block-start";

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
  const model = useMemo(
    () => resolveLabModel(config, locale),
    [config, locale],
  );

  const reduce = useMemo(() => labReducer(config.variants), [config.variants]);
  const [state, dispatch] = useReducer(
    reduce,
    config.variants[0],
    (variant) => ({
      variantId: variant.id,
      props: { ...variant.props },
    }),
  );

  const run = useCallback((action: LabAction) => {
    startTransition(() => {
      dispatch(action);
    });
  }, []);

  // The stage fills what the chrome above it leaves of the first screen, and
  // the header's height at this width is known only once the page is laid out.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!isCompact || !stage) return;
    let isStale = false;
    const measure = () => {
      if (isStale) return;
      const blockStart = stage.getBoundingClientRect().top + window.scrollY;
      stage.style.setProperty(STAGE_BLOCK_START, `${String(blockStart)}px`);
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

  // A sample-driven prop holds the sample's id, which is what the snippet and
  // the controls read. The Specimen needs the node the id stands for.
  const specimenProps = useMemo(() => {
    const resolved: LabProps = { ...state.props };
    for (const control of model.controls) {
      if (control.samples === undefined) continue;
      const sample = control.samples.find(
        (choice) => choice.id === state.props[control.name],
      );
      resolved[control.name] = sample?.value;
    }
    return resolved;
  }, [model.controls, state.props]);

  const snippet = useMemo(
    () =>
      buildLabSnippet({
        element: config.element,
        importPath: config.importPath,
        props: state.props,
        docs: config.propsDoc.props,
        controls: model.controls,
      }),
    [
      config.element,
      config.importPath,
      config.propsDoc.props,
      model.controls,
      state.props,
    ],
  );

  return (
    <div css={[texture.dot, styles.canvas]}>
      <div ref={stageRef} css={styles.stage}>
        <div css={styles.specimenArea}>
          <ViewTransition name="lab-specimen" default="lab-morph">
            <div css={styles.specimen}>
              {/* A component's own types rule out pairings the visitor is free
                  to make — a Button with neither children nor an aria-label.
                  The Specimen's props are therefore typed at runtime, from the
                  generated documentation, and named here. */}
              {/* eslint-disable-next-line no-restricted-syntax -- see above */}
              {config.render(specimenProps as P)}
            </div>
          </ViewTransition>
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
    gap: space._5,
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
    gap: space._6,
    minInlineSize: 0,
    // Below `md` the stage takes the first screen, to a step above the bar, so
    // the snippet shows without a scroll and the Specimen centres in the room
    // it leaves.
    minBlockSize: {
      default: `calc(100dvh - var(${STAGE_BLOCK_START}, 0px) - ${labBar.clearance} - ${space._4})`,
      [breakpoints.md]: null,
    },
  },
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
