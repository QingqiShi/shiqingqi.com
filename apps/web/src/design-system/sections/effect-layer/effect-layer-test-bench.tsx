"use client";

import * as stylex from "@stylexjs/stylex";
import { Badge } from "@tuja/ui/components/badge";
import { Button } from "@tuja/ui/components/button";
import { Switch } from "@tuja/ui/components/switch";
import { Text } from "@tuja/ui/components/text";
import { useEffectBoundary } from "@tuja/ui/hooks/use-effect-boundary";
import { useIsHydrated } from "@tuja/ui/hooks/use-is-hydrated";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { cluster, row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  border,
  color,
  font,
  layer,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import type { StyleProp } from "@tuja/ui/types";
import { useState } from "react";
import { createPortal } from "react-dom";
import { t } from "#src/i18n.ts";

function Swatch({
  token,
  shape,
  css,
}: {
  token: string;
  shape: string;
  css: StyleProp;
}) {
  const ref = useEffectBoundary();
  return (
    <div
      ref={ref}
      data-effect-registered=""
      data-effect-test-element=""
      css={[flex.col, styles.swatch, css]}
    >
      <span css={[typeRole.caption, styles.token]}>{token}</span>
      <span css={[typeRole.caption, styles.token]}>{shape}</span>
    </div>
  );
}

function FixedElement() {
  const ref = useEffectBoundary();
  return (
    <div
      ref={ref}
      data-effect-registered=""
      data-effect-test-fixed=""
      css={[flex.col, corner.radius_3, styles.raised, styles.fixed]}
    >
      <Text look="bodySmall" weight="semibold">
        {t({ en: "Fixed element", zh: "固定元素" })}
      </Text>
      <Text look="caption" tone="muted">
        {t({
          en: "Measured against the viewport",
          zh: "相对视口测量",
        })}
      </Text>
    </div>
  );
}

/**
 * Registered elements made for checking what the effect layer measures:
 * different fills and corners, a translucent fill, a control whose fill
 * changes on hover, a block that pushes them down, and one fixed element.
 */
export function EffectLayerTestBench() {
  const [hasBlock, setHasBlock] = useState(false);
  const [fixedChoice, setFixedChoice] = useState<boolean | null>(null);
  const isHydrated = useIsHydrated();
  const buttonRef = useEffectBoundary();
  const badgeRef = useEffectBoundary();
  // Show the fixed element at the start only in the debug view, where you
  // check it. Elsewhere it covers the page for no reason.
  const hasFixed =
    fixedChoice ??
    (isHydrated &&
      new URLSearchParams(window.location.search).get("effects") === "debug");

  return (
    <div css={stack.item}>
      <label css={[row.tight, styles.control]}>
        <Switch
          value={hasFixed ? "on" : "off"}
          onChange={(state) => {
            setFixedChoice(state === "on");
          }}
        />
        <Text look="bodySmall">
          {t({ en: "Show the fixed element", zh: "显示固定元素" })}
        </Text>
      </label>

      {hasBlock && (
        <div
          data-effect-test-block=""
          css={[flex.center, corner.radius_3, styles.block]}
        >
          <Text look="bodySmall" tone="muted">
            {t({
              en: "Added above the elements, to move them down",
              zh: "加在元素上方，把它们往下推",
            })}
          </Text>
        </div>
      )}

      <div css={cluster.item}>
        <Swatch
          token="color.bgSurfaceRaised"
          shape="corner.radius_3"
          css={[corner.radius_3, styles.raised]}
        />
        <Swatch
          token="color.bgAccent"
          shape="corner.radius_4"
          css={[corner.radius_4, styles.accent]}
        />
        <Swatch
          token="color.bgMaterialGlass"
          shape="corner.radius_2"
          css={[corner.radius_2, styles.glass]}
        />
        <Button
          ref={buttonRef}
          data-effect-registered=""
          onClick={() => {
            setHasBlock((current) => !current);
          }}
        >
          {hasBlock
            ? t({ en: "Remove block", zh: "移除色块" })
            : t({ en: "Add block above", zh: "在上方加色块" })}
        </Button>
        <Badge ref={badgeRef} data-effect-registered="" intent="info">
          {t({ en: "Badge", zh: "徽标" })}
        </Badge>
      </div>

      {hasFixed && createPortal(<FixedElement />, document.body)}
    </div>
  );
}

const styles = stylex.create({
  control: {
    alignSelf: "flex-start",
  },
  block: {
    blockSize: space._11,
    paddingInline: space._3,
    borderWidth: border.size_1,
    borderStyle: "dashed",
    borderColor: color.border,
  },
  swatch: {
    justifyContent: "flex-end",
    gap: rhythm.tight,
    inlineSize: space._13,
    blockSize: space._11,
    padding: space._3,
  },
  token: {
    fontFamily: font.familyMono,
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
  glass: {
    color: color.fg,
    backgroundColor: color.bgMaterialGlass,
  },
  fixed: {
    position: "fixed",
    insetBlockEnd: space._4,
    insetInlineEnd: space._4,
    zIndex: layer.raised,
    gap: rhythm.tight,
    paddingBlock: space._2,
    paddingInline: space._3,
  },
});
