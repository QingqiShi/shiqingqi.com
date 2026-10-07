"use client";

import * as stylex from "@stylexjs/stylex";
import { EffectContainer } from "@tuja/ui/components/effect-container";
import { Text } from "@tuja/ui/components/text";
import { useEffectContainer } from "@tuja/ui/hooks/use-effect-container";
import { useRipple } from "@tuja/ui/hooks/use-ripple";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { DustTile, Fan as SharedFan, Token } from "./dust-tile.tsx";

// Each fan reaches well past the container beside it, so a pull across the
// container's edge would show.
const PAGE_REACH = 600;
const CONTAINER_REACH = 600;

interface CaseElementProps {
  /** Names the element for the end-to-end tests. */
  testId: string;
}

const testAttributes = (testId: string) => ({
  "data-effect-container-test": testId,
});

function Source({ testId }: CaseElementProps) {
  return <DustTile density={8} attributes={testAttributes(testId)} />;
}

function Fan({ testId, reach }: CaseElementProps & { reach: number }) {
  return (
    <SharedFan
      reach={reach}
      attributes={testAttributes(testId)}
      css={styles.fan}
    />
  );
}

function RippleTile({ testId }: CaseElementProps) {
  const ref = useRipple();
  return (
    <div
      ref={ref}
      data-effect-registered=""
      {...testAttributes(testId)}
      css={[flex.center, corner.radius_2, styles.ripple]}
    >
      <Token>useRipple</Token>
    </div>
  );
}

function Container({
  testId,
  css,
  children,
}: CaseElementProps & { css?: StyleProp; children: ReactNode }) {
  const container = useEffectContainer();
  return (
    <div
      ref={container}
      data-effect-registered=""
      {...testAttributes(testId)}
      css={[corner.radius_3, styles.container, css]}
    >
      <EffectContainer value={container}>{children}</EffectContainer>
    </div>
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
 * Elements made for checking Effect containers: dust in a container beside a
 * fan on the page; dust on the page beside a container that holds a fan;
 * and an element with rings close to its container's edge.
 */
export function EffectContainerTestBench() {
  return (
    <div css={[flex.col, styles.bench]}>
      <Case
        label={t({
          en: "Dust in a container, and a fan on the page",
          zh: "容器中的灰尘，以及页面上的抽风机",
        })}
      >
        <div css={[flex.row, styles.stage]}>
          <Container testId="dust-container" css={styles.wide}>
            <Source testId="inner-source" />
          </Container>
          <Fan testId="page-fan" reach={PAGE_REACH} />
        </div>
      </Case>

      <Case
        label={t({
          en: "Dust on the page, and a fan in a container",
          zh: "页面上的灰尘，以及容器中的抽风机",
        })}
      >
        <div css={[flex.row, styles.stage, styles.apart]}>
          <Source testId="page-source" />
          <Container testId="fan-container">
            <Fan testId="inner-fan" reach={CONTAINER_REACH} />
          </Container>
        </div>
      </Case>

      <Case
        label={t({
          en: "Rings close to the edge of their container",
          zh: "靠近容器边缘的涟漪",
        })}
      >
        <Container testId="ripple-container" css={styles.tight}>
          <RippleTile testId="inner-ripple" />
        </Container>
      </Case>
    </div>
  );
}

const styles = stylex.create({
  bench: {
    gap: space._14,
    containerType: "inline-size",
  },
  case: {
    gap: space._5,
  },
  stage: {
    flexDirection: {
      default: "column",
      "@container (min-width: 42.5rem)": "row",
    },
    alignItems: "center",
    gap: space._10,
  },
  // Far enough that the dust does not drift to the container, and near
  // enough for the container's fan to reach it if the container let it.
  apart: {
    gap: space._14,
  },
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: space._7,
    padding: space._7,
    color: color.fg,
    backgroundColor: color.bgSurfaceRaised,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  wide: {
    inlineSize: space._15,
    maxInlineSize: "100%",
  },
  // Nearer the rings' reach on the right than on the left, so the rings get
  // past the right edge only if the container does not clip them.
  tight: {
    alignSelf: "flex-start",
    alignItems: "flex-end",
    paddingInlineStart: space._12,
    paddingInlineEnd: space._1,
    paddingBlock: space._1,
  },
  ripple: {
    flexShrink: 0,
    inlineSize: space._10,
    blockSize: space._10,
    color: color.fgOnAccent,
    backgroundColor: color.bgAccent,
  },
  fan: {
    inlineSize: space._11,
    blockSize: space._11,
  },
});
