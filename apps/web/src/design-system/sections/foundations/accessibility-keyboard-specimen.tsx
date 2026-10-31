"use client";

import { ShareIcon } from "@phosphor-icons/react/dist/ssr/Share";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import {
  border,
  color,
  controlHeight,
  controlSize,
} from "@tuja/ui/tokens.stylex";
import { useState } from "react";

/**
 * A row to Tab through: a Button, a group that is one Tab stop, and a button
 * built from `buttonReset.base`, which draws the same ring.
 */
export function AccessibilityKeyboardSpecimen() {
  const [view, setView] = useState("grid");

  return (
    <div css={cluster.item}>
      <Button look="outline" icon={<ShareIcon weight="bold" />}>
        {t({ en: "Share", zh: "分享" })}
      </Button>
      <SegmentedControl
        aria-label={t({ en: "View", zh: "视图" })}
        options={[
          { value: "grid", label: t({ en: "Grid", zh: "网格" }) },
          { value: "list", label: t({ en: "List", zh: "列表" }) },
          { value: "compact", label: t({ en: "Compact", zh: "紧凑" }) },
        ]}
        value={view}
        onChange={setView}
      />
      <button
        type="button"
        css={[
          buttonReset.base,
          flex.inlineCenter,
          corner.radius_round,
          styles.ownButton,
        ]}
      >
        <TrashIcon weight="bold" aria-hidden />
        <span css={a11y.srOnly}>{t({ en: "Delete", zh: "删除" })}</span>
      </button>
    </div>
  );
}

const styles = stylex.create({
  ownButton: {
    inlineSize: controlHeight.md,
    blockSize: controlHeight.md,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    fontSize: controlSize._4,
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    backgroundColor: {
      default: color.bgSurface,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
  },
});
