"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { useEffectBoundary } from "@tuja/ui/hooks/use-effect-boundary";
import { useRipple } from "@tuja/ui/hooks/use-ripple";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { border, color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { useState, type ReactNode, type Ref } from "react";
import { t } from "#src/i18n.ts";

interface TileProps {
  name: string;
  token: string;
  css: StyleProp;
  children?: ReactNode;
}

function Tile({
  name,
  token,
  css,
  children,
  ref,
}: TileProps & { ref: Ref<HTMLDivElement> }) {
  return (
    <div
      ref={ref}
      data-effect-registered=""
      data-ripple-test={name}
      css={[flex.col, styles.tile, css]}
    >
      {children}
      <span css={styles.token}>{token}</span>
    </div>
  );
}

function TileWithRipple({
  ambient,
  ...props
}: TileProps & { ambient?: boolean }) {
  const ref = useRipple({ ambient });
  return <Tile ref={ref} {...props} />;
}

function TileWithBoundary(props: TileProps) {
  const ref = useEffectBoundary();
  return <Tile ref={ref} {...props} />;
}

/**
 * Elements made for checking Ripple: fills from opaque to translucent,
 * different corners, a control, a pill, a registered element without a
 * ripple for rings to fade against, and a switch that puts one tile on the
 * ambient beat.
 */
export function EffectLayerRippleBench() {
  const [ambient, setAmbient] = useState(false);
  const [presses, setPresses] = useState(0);
  const buttonRipple = useRipple();
  const badgeRipple = useRipple();

  return (
    <div css={stack.item}>
      <label css={[row.tight, styles.control]}>
        <Switch
          value={ambient ? "on" : "off"}
          onChange={(state) => {
            setAmbient(state === "on");
          }}
        />
        <Text look="bodySmall">
          {t({
            en: "Pulse the accent tile on a beat",
            zh: "让强调色方块按节拍脉动",
          })}
        </Text>
      </label>

      <div css={styles.grid}>
        <TileWithRipple
          name="raised"
          token="color.bgSurfaceRaised"
          css={[corner.radius_3, styles.raised]}
        />
        <TileWithRipple
          ambient={ambient}
          name="accent"
          token="color.bgAccent"
          css={[corner.radius_4, styles.accent]}
        />
        <TileWithRipple
          name="accent-subtle"
          token="color.bgAccentSubtle"
          css={[corner.radius_3, styles.accentSubtle]}
        />
        <TileWithRipple
          name="glass"
          token="color.bgMaterialGlass"
          css={[corner.radius_2, styles.glass]}
        />
        <TileWithBoundary
          name="no-ripple"
          token="useEffectBoundary"
          css={[corner.radius_3, styles.plain]}
        >
          <Text look="caption" tone="muted">
            {t({ en: "Registered, no ripple", zh: "已登记，无涟漪" })}
          </Text>
        </TileWithBoundary>
        <TileWithRipple
          name="info"
          token="color.bgInfo"
          css={[corner.radius_5, styles.info]}
        />
      </div>

      <div css={cluster.item}>
        <Button
          ref={buttonRipple}
          data-effect-registered=""
          onClick={() => {
            setPresses((count) => count + 1);
          }}
        >
          {t({ en: "Count presses", zh: "计数按下次数" })}
        </Button>
        <Badge ref={badgeRipple} data-effect-registered="" intent="success">
          {String(presses)}
        </Badge>
      </div>
    </div>
  );
}

const styles = stylex.create({
  control: {
    alignSelf: "flex-start",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(2, minmax(0, 1fr))",
      [breakpoints.md]: "repeat(3, minmax(0, 1fr))",
    },
    gap: rhythm.item,
  },
  tile: {
    justifyContent: "flex-end",
    gap: rhythm.tight,
    blockSize: space._11,
    padding: space._3,
  },
  token: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    overflowWrap: "anywhere",
  },
  raised: {
    color: color.fg,
    backgroundColor: color.bgSurfaceRaised,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
  },
  accent: {
    color: color.fgOnAccent,
    backgroundColor: color.bgAccent,
  },
  accentSubtle: {
    color: color.fgAccent,
    backgroundColor: color.bgAccentSubtle,
  },
  glass: {
    color: color.fg,
    backgroundColor: color.bgMaterialGlass,
  },
  plain: {
    color: color.fg,
    backgroundColor: color.bgSurface,
    borderWidth: border.size_1,
    borderStyle: "dashed",
    borderColor: color.border,
  },
  info: {
    color: color.fgOnInfo,
    backgroundColor: color.bgInfo,
  },
});
