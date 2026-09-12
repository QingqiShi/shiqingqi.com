"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Popover } from "@tuja/ui/components/popover";
import { Text } from "@tuja/ui/components/text";
import type { PopoverPlacement } from "@tuja/ui/hooks/use-popover";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { StateReadout } from "../../showcase.tsx";

/** The trigger and its panel, illustrating a Popover with arbitrary content. */
export function AnchoredPanelDemo() {
  // Hoisted out of the render prop: `t()` has to be called in render scope.
  const anchoredLabel = t({ en: "Anchored panel", zh: "锚定面板" });
  return (
    <Popover
      trigger={(triggerProps) => (
        <Button {...triggerProps} look="primary">
          {anchoredLabel}
        </Button>
      )}
    >
      <div css={[flex.col, styles.narrowPanel, styles.panel]}>
        <Text as="span" look="bodySmall" weight="semibold">
          {t({ en: "Arbitrary content", zh: "任意内容" })}
        </Text>
        <Text look="caption" tone="muted">
          {t({
            en: "A popover is not a menu. Put prose, a field, or a small form in it — the component owns the surface, the placement, and the dismissal rules, and nothing else.",
            zh: "浮层不是菜单。这里可以放文字、输入框或一个小表单——组件只负责浮层表面、位置和关闭规则，其余都交给你。",
          })}
        </Text>
      </div>
    </Popover>
  );
}

/** One trigger per placement; the trigger's label is the value it passes. */
export function PlacementDemo({ placement }: { placement: PopoverPlacement }) {
  return (
    <Popover
      placement={placement}
      trigger={(triggerProps) => (
        <Button {...triggerProps} size="sm" look="outline">
          {placement}
        </Button>
      )}
    >
      <span css={styles.placementPanel}>{placement}</span>
    </Popover>
  );
}

/** Wider than its trigger, so near a window edge the panel has to shift back. */
export function RailPopover({ label }: { label: string }) {
  return (
    <Popover
      placement="bottom"
      trigger={(triggerProps) => (
        <Button {...triggerProps} size="sm">
          {label}
        </Button>
      )}
    >
      <Text look="bodySmall" tone="muted" css={styles.narrowPanel}>
        {t({
          en: "This panel is wider than the trigger it hangs off, so against a window edge it slides back inside rather than running off screen.",
          zh: "这个面板比它挂靠的触发元素更宽，因此贴到窗口边缘时会滑回屏幕内，而不会跑出屏幕之外。",
        })}
      </Text>
    </Popover>
  );
}

/** Asks for the top; flips to the bottom when the top has no room. */
export function FlipDemo() {
  const prefersTopLabel = t({ en: "Prefers the top", zh: "偏好上方" });
  return (
    <Popover
      placement="top"
      trigger={(triggerProps) => (
        <Button {...triggerProps} look="outline">
          {prefersTopLabel}
        </Button>
      )}
    >
      <Text look="bodySmall" tone="muted" css={styles.narrowPanel}>
        {t({
          en: "A side only flips when the opposite one fits. When neither does, the panel stays on the side you asked for and shifts as far as the gutter allows.",
          zh: "只有当对面一侧放得下时，边才会翻转。若两侧都放不下，面板会留在你请求的一侧，并在间距允许的范围内尽量平移。",
        })}
      </Text>
    </Popover>
  );
}

export function DismissalDemo() {
  const [open, setOpen] = useState(false);
  // Hoisted out of the render prop: `t()` has to be called in render scope.
  const triggerLabel = t({ en: "Open the panel", zh: "打开面板" });
  return (
    <div css={[flex.row, styles.demoRow]}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger={(triggerProps) => (
          <Button {...triggerProps} look="primary">
            {triggerLabel}
          </Button>
        )}
      >
        <div css={[flex.col, styles.narrowPanel, styles.panel]}>
          <Text look="bodySmall">
            {t({
              en: "Tab through these two controls, then once more — focus leaves the panel instead of cycling back to the first.",
              zh: "用 Tab 走过这两个控件，再按一次——焦点会离开面板，而不会绕回第一个。",
            })}
          </Text>
          <div css={[flex.row, styles.panelActions]}>
            <Button
              size="sm"
              look="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              {t({ en: "Close", zh: "关闭" })}
            </Button>
            <Button size="sm" look="ghost">
              {t({ en: "Second control", zh: "第二个控件" })}
            </Button>
          </div>
        </div>
      </Popover>
      <Button look="ghost">
        {t({ en: "Somewhere else", zh: "其他位置" })}
      </Button>
      <StateReadout label="onOpenChange →">
        {open ? "true" : "false"}
      </StateReadout>
    </div>
  );
}

export function PortalTargetDemo() {
  // A ref alone would not re-render, and the popover needs the element as a
  // prop. Until it arrives the target is `null`, which holds the panel back.
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const triggerLabel = t({
    en: "Open into the box below",
    zh: "渲染到下方方框中",
  });
  return (
    <div css={[flex.col, styles.stack]}>
      <Popover
        portalTarget={host}
        trigger={(triggerProps) => (
          <Button {...triggerProps}>{triggerLabel}</Button>
        )}
      >
        <Text look="bodySmall" tone="muted" css={styles.narrowPanel}>
          {t({
            en: "In the DOM this panel is a child of the dashed box. On screen it is still placed against the viewport, which is why nothing about it looks different.",
            zh: "在 DOM 中，这个面板是虚线方框的子节点。在屏幕上它依然相对视口定位，所以外观没有任何变化。",
          })}
        </Text>
      </Popover>
      <div ref={setHost} css={[corner.radius_2, styles.portalHost]}>
        <span css={styles.code}>portalTarget</span>
      </div>
    </div>
  );
}

/** The "do" half of the trigger-and-panel guideline: structured content. */
export function RepaymentSourcesDemo() {
  const sourcesLabel = t({ en: "Repayment sources", zh: "还款来源" });
  return (
    <Popover
      placement="bottom-start"
      trigger={(triggerProps) => (
        <Button {...triggerProps} size="sm">
          {sourcesLabel}
        </Button>
      )}
    >
      <div css={[flex.col, styles.narrowPanel, styles.panel]}>
        <Text as="span" look="bodySmall" weight="semibold">
          {t({ en: "Two sources", zh: "两个来源" })}
        </Text>
        <Text look="caption" tone="muted">
          {t({
            en: "Payroll deductions and the annual self-assessment return.",
            zh: "工资代扣，以及每年的自评税申报。",
          })}
        </Text>
      </div>
    </Popover>
  );
}

/** The "don't" half of the trigger-and-panel guideline: a hint used as a tooltip. */
export function HintDemo() {
  const hintLabel = t({ en: "What's this?", zh: "这是什么？" });
  return (
    <Popover
      placement="top"
      trigger={(triggerProps) => (
        <Button {...triggerProps} size="sm" look="ghost">
          {hintLabel}
        </Button>
      )}
    >
      <Text look="caption" tone="muted">
        {t({ en: "Sorted newest first.", zh: "按最新排序。" })}
      </Text>
    </Popover>
  );
}

const styles = stylex.create({
  demoRow: {
    inlineSize: "100%",
    flexWrap: "wrap",
    gap: space._3,
  },
  // The cap a popover's prose takes, so the panel reads as a paragraph rather
  // than as a line running the width of the page.
  narrowPanel: {
    maxInlineSize: "34ch",
  },
  panel: {
    gap: space._1,
  },
  panelActions: {
    gap: space._1,
  },
  stack: {
    inlineSize: "100%",
    gap: space._3,
    alignItems: "flex-start",
  },
  placementPanel: {
    display: "block",
    minInlineSize: space._12,
    textAlign: "center",
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
  // Dashed, because the box is a destination rather than a surface — nothing
  // ever paints inside it where the reader can see.
  portalHost: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    minBlockSize: space._8,
    borderWidth: border.size_1,
    borderStyle: "dashed",
    borderColor: color.neutralBorder,
  },
});
