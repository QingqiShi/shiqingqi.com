"use client";

import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { useBlackHole } from "@tuja/ui/hooks/use-black-hole";
import { useLightBeam } from "@tuja/ui/hooks/use-light-beam";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useEffect, useRef, useState } from "react";
import { t } from "#src/i18n.ts";

/** The highest the Black hole on a band edge can sit, from the stage's top. */
const EDGE_SEARCH_START = 380;

/**
 * The centre of the Black hole that sits on a band edge, from the stage's
 * top: the first edge between two scroll `<canvas>` elements below
 * `EDGE_SEARCH_START`. It reads the band height from those `<canvas>`
 * elements, and sits at `EDGE_SEARCH_START` until they mount.
 */
function useBandEdgeOffset() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState(EDGE_SEARCH_START);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null) {
      return;
    }
    let measured: Element | null = null;
    const place = () => {
      const canvas = document.querySelector('[data-effect-layer="scroll"]');
      const layer = canvas?.parentElement;
      if (!(canvas instanceof HTMLElement) || layer == null) {
        return;
      }
      if (canvas !== measured) {
        resizeObserver.observe(canvas);
        measured = canvas;
      }
      const band = canvas.offsetHeight;
      const stageTop =
        stage.getBoundingClientRect().top - layer.getBoundingClientRect().top;
      setOffset(
        Math.ceil((stageTop + EDGE_SEARCH_START) / band) * band - stageTop,
      );
    };
    const resizeObserver = new ResizeObserver(place);
    resizeObserver.observe(document.body);
    const mutationObserver = new MutationObserver(place);
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    place();
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return { stageRef, offset };
}

/**
 * Two Light beams and two Black holes made for checking the effect: a round
 * Black hole near the first beam, and a card-shaped one that always sits on
 * the edge between the two scroll `<canvas>` elements.
 */
export function BlackHoleTestBench() {
  const { stageRef, offset } = useBandEdgeOffset();
  const accentBeam = useLightBeam();
  const warmBeam = useLightBeam();
  const roundBlackHole = useBlackHole({ mass: 1.5 });
  const edgeBlackHole = useBlackHole();

  return (
    <div ref={stageRef} data-black-hole-stage="" css={styles.stage}>
      <div
        ref={accentBeam}
        data-effect-registered=""
        data-light-beam-test=""
        css={[
          typeRole.label,
          flex.center,
          corner.radius_round,
          styles.beam,
          styles.accent,
        ]}
      >
        {t({ en: "Light beam", zh: "光束" })}
      </div>
      <div
        ref={roundBlackHole}
        data-effect-registered=""
        data-black-hole-test="round"
        css={[flex.col, flex.center, corner.radius_round, styles.disc]}
      >
        <Text look="caption" tone="muted">
          {t({ en: "Black hole", zh: "黑洞" })}
        </Text>
        <Text look="caption" tone="muted" css={styles.code}>
          mass: 1.5
        </Text>
      </div>
      <div
        ref={edgeBlackHole}
        data-effect-registered=""
        data-black-hole-test="band-edge"
        css={[flex.col, corner.radius_3, styles.card, styles.onEdge(offset)]}
      >
        <Text look="bodySmall" weight="semibold">
          {t({ en: "Black hole", zh: "黑洞" })}
        </Text>
        <Text look="caption" tone="muted">
          {t({
            en: "On the edge between two scroll <canvas> elements",
            zh: "位于两个滚动 <canvas> 元素的交界处",
          })}
        </Text>
      </div>
      <div
        ref={warmBeam}
        data-effect-registered=""
        data-light-beam-test=""
        css={[
          typeRole.label,
          flex.center,
          corner.radius_round,
          styles.beam,
          styles.warm,
        ]}
      >
        {t({ en: "Light beam", zh: "光束" })}
      </div>
    </div>
  );
}

const styles = stylex.create({
  stage: {
    position: "relative",
    blockSize: `calc(120lvh + ${String(EDGE_SEARCH_START + 120)}px)`,
    // Keep the next bench out of the reach of the first beam. The beam can
    // point down at the Black hole on the band edge. While its light can
    // reach the screen, the effect draws each frame. In software rendering
    // that is slow, and the dust specs below then time out.
    marginBlockEnd: space._14,
  },
  beam: {
    position: "absolute",
    paddingBlock: space._1,
    paddingInline: space._3,
    fontWeight: font.weight_6,
  },
  // Keep the beam clear of the helper text above it. The specs read light in
  // a box beside the beam, and text in that box also reads as light.
  accent: {
    insetBlockStart: space._8,
    insetInlineStart: "6%",
    color: color.fgOnAccent,
    backgroundColor: color.bgAccent,
  },
  warm: {
    insetBlockEnd: space._7,
    insetInlineEnd: "6%",
    color: color.fgOnWarning,
    backgroundColor: color.bgWarning,
  },
  disc: {
    position: "absolute",
    insetBlockStart: space._12,
    insetInlineEnd: "12%",
    inlineSize: space._11,
    blockSize: space._11,
    gap: rhythm.tight,
    backgroundColor: color.bgCanvas,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  card: {
    position: "absolute",
    insetInlineStart: "6%",
    justifyContent: "flex-end",
    gap: rhythm.tight,
    inlineSize: space._13,
    blockSize: space._11,
    padding: space._3,
    marginBlockStart: `calc(${space._11} / -2)`,
    backgroundColor: color.bgSurface,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  code: {
    fontFamily: font.familyMono,
  },
  onEdge: (offset: number) => ({
    insetBlockStart: `${String(offset)}px`,
  }),
});
