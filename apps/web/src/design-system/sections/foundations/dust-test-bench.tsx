import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Dust } from "@tuja/ui/components/dust";
import { EffectBoundary } from "@tuja/ui/components/effect-boundary";
import { ExtractorFan } from "@tuja/ui/components/extractor-fan";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";

// Each fan reaches its own dust and no other case's: the cases sit further
// apart than the longest reach next to them.
const NEAR_REACH = 300;
const FAR_REACH = 760;
const PILLAR_REACH = 280;

interface CaseElementProps {
  /** Names the element for the end-to-end tests. */
  testId: string;
}

function Source({
  testId,
  token,
  css,
}: CaseElementProps & { token: string; css: StyleProp }) {
  return (
    <Dust>
      <div
        data-dust-test={testId}
        css={[flex.col, corner.radius_3, styles.source, css]}
      >
        <span css={styles.name}>Dust</span>
        <span css={styles.token}>{token}</span>
      </div>
    </Dust>
  );
}

function Fan({ testId, reach }: CaseElementProps & { reach: number }) {
  return (
    <ExtractorFan reach={reach}>
      <div
        data-dust-test={testId}
        css={[flex.center, corner.radius_round, styles.surface, styles.fan]}
      >
        <span css={styles.name}>Extractor fan</span>
        <span css={styles.token}>reach={reach}</span>
      </div>
    </ExtractorFan>
  );
}

function Case({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div css={[flex.col, styles.case]}>
      <Text look="bodySmall" tone="muted">
        {label}
      </Text>
      {children}
    </div>
  );
}

/**
 * Elements made for checking the dust effect: dust with no fan in reach, a
 * fan close to its dust, two pillars taller than a band so the flow between
 * them always crosses a band edge, and a far fan past an obstacle.
 */
export function DustTestBench() {
  return (
    <div css={[flex.col, styles.bench]}>
      <Case label={t({ en: "No fan in reach", zh: "范围内没有抽风机" })}>
        <div css={styles.stage}>
          <Source
            testId="alone-source"
            token="color.bgSurfaceRaised"
            css={styles.surface}
          />
        </div>
      </Case>

      <Case label={t({ en: "A fan close by", zh: "近处的抽风机" })}>
        <div css={[styles.stage, styles.near]}>
          <Source
            testId="near-source"
            token="color.bgAccent"
            css={styles.accent}
          />
          <Fan testId="near-fan" reach={NEAR_REACH} />
        </div>
      </Case>

      <Case
        label={t({
          en: "Two pillars taller than a band, so the flow crosses a band edge",
          zh: "两根比带更高的柱子，粒子流因此会跨过带的边缘",
        })}
      >
        <div css={[flex.row, styles.pillars]}>
          <Dust>
            <div
              data-dust-test="pillar-source"
              css={[corner.radius_round, styles.pillar, styles.success]}
            />
          </Dust>
          <ExtractorFan reach={PILLAR_REACH}>
            <div
              data-dust-test="pillar-fan"
              css={[corner.radius_round, styles.surface, styles.pillar]}
            />
          </ExtractorFan>
        </div>
      </Case>

      <Case
        label={t({
          en: "A fan far away, past an obstacle",
          zh: "远处的抽风机，中间隔着障碍物",
        })}
      >
        <div css={[styles.stage, styles.near, styles.far]}>
          <Source testId="far-source" token="color.bgInfo" css={styles.info} />
          <EffectBoundary>
            <div
              data-dust-test="obstacle"
              css={[
                flex.center,
                corner.radius_round,
                styles.surface,
                styles.obstacle,
              ]}
            >
              <span css={styles.token}>EffectBoundary</span>
            </div>
          </EffectBoundary>
          <Fan testId="far-fan" reach={FAR_REACH} />
        </div>
      </Case>
    </div>
  );
}

const styles = stylex.create({
  bench: {
    gap: space._14,
  },
  case: {
    gap: space._5,
  },
  stage: {
    display: "flex",
    alignItems: "center",
  },
  near: {
    flexDirection: { default: "column", [breakpoints.md]: "row" },
    gap: space._12,
  },
  far: {
    justifyContent: "space-between",
  },
  pillars: {
    alignItems: "stretch",
    gap: space._12,
  },
  pillar: {
    inlineSize: space._8,
    // A band is 1.2 large viewport heights, so a band edge falls at least
    // 0.15 of one from either end.
    blockSize: "150lvh",
  },
  source: {
    justifyContent: "flex-end",
    gap: space._00,
    inlineSize: space._13,
    blockSize: space._11,
    padding: space._3,
  },
  surface: {
    color: color.fg,
    backgroundColor: color.bgSurfaceRaised,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  fan: {
    flexDirection: "column",
    gap: space._00,
    inlineSize: space._12,
    blockSize: space._12,
  },
  obstacle: {
    blockSize: space._8,
    paddingInline: space._4,
    color: color.fgMuted,
  },
  name: {
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
  },
  accent: {
    color: color.fgOnAccent,
    backgroundColor: color.bgAccent,
  },
  info: {
    color: color.fgOnInfo,
    backgroundColor: color.bgInfo,
  },
  success: {
    backgroundColor: color.bgSuccess,
  },
});
