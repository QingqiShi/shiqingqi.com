"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { Text } from "@tuja/ui/components/text";
import { usePopover } from "@tuja/ui/hooks/use-popover";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import {
  controlSize,
  font,
  layer,
  rhythm,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { gridlineTokens } from "#src/design-system/gridline-ground.stylex.ts";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { hooksSpecimen } from "./hooks-specimen.stylex.ts";

type LabelIntent =
  "accent" | "info" | "success" | "warning" | "danger" | "neutral";

/** A picker whose popup is a bare colour grid — markup that `Popover`'s padded surface would fight. */
function IntentPickerSpecimen() {
  const [selected, setSelected] = useState<LabelIntent>("accent");
  const { open, setOpen, triggerProps, contentProps } = usePopover();
  const intents: readonly LabelIntent[] = [
    "accent",
    "info",
    "success",
    "warning",
    "danger",
    "neutral",
  ];
  const labels: Record<LabelIntent, string> = {
    accent: t({ en: "Accent", zh: "强调" }),
    info: t({ en: "Info", zh: "信息" }),
    success: t({ en: "Success", zh: "成功" }),
    warning: t({ en: "Warning", zh: "警告" }),
    danger: t({ en: "Danger", zh: "危险" }),
    neutral: t({ en: "Neutral", zh: "中性" }),
  };
  const fieldLabel = t({ en: "Label colour", zh: "标签颜色" });
  return (
    <div css={[stack.item, styles.alignStart]}>
      <button
        {...triggerProps}
        aria-label={`${fieldLabel}: ${labels[selected]}`}
        css={[
          typeRole.label,
          buttonReset.base,
          flex.row,
          corner.radius_round,
          styles.intentTrigger,
        ]}
      >
        <span
          aria-hidden="true"
          css={[corner.radius_round, styles.intentDot, intentFill[selected]]}
        />
        {labels[selected]}
      </button>
      {open ? (
        <div {...contentProps} css={[corner.radius_2, styles.pickerPopup]}>
          {intents.map((intent) => (
            <button
              key={intent}
              type="button"
              aria-label={labels[intent]}
              aria-pressed={intent === selected}
              css={[
                buttonReset.base,
                a11y.focusRingInset,
                styles.pickerCell,
                intentFill[intent],
                intent === selected && styles.pickerCellSelected,
              ]}
              onClick={() => {
                setSelected(intent);
                setOpen(false);
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** A hint placed above its trigger; growing it re-runs the placement maths. */
function PlacementSpecimen() {
  const [expanded, setExpanded] = useState(false);
  const { open, triggerProps, contentProps } = usePopover({
    placement: "top-start",
    onOpenChange: (next) => {
      if (!next) setExpanded(false);
    },
  });
  const triggerLabel = t({ en: "What is this?", zh: "这是什么？" });
  const summary = t({
    en: "Placement is measured against the viewport, so this sits above the trigger only while there is room above it.",
    zh: "定位以视口为准，因此只有上方有空间时，它才会停在触发元素之上。",
  });
  const detail = t({
    en: "Scroll until the trigger nears the top edge and the side flips to bottom. Expand or collapse this panel and the placement runs again — the hook watches the popup's own size as well as the trigger's.",
    zh: "向下滚动，触发元素接近顶边时它会翻到下方。展开或收起这块面板，定位也会重新计算——钩子既观察触发元素的尺寸，也观察弹出层自身的尺寸。",
  });
  return (
    <div css={[stack.item, styles.alignStart]}>
      <button
        {...triggerProps}
        css={[typeRole.label, buttonReset.base, styles.hintTrigger]}
      >
        {triggerLabel}
      </button>
      {open ? (
        <div
          {...contentProps}
          css={[
            flex.col,
            popoverSurface.base,
            popoverSurface.enter,
            styles.hintPopup,
          ]}
        >
          <Text look="caption" tone="muted">
            {summary}
          </Text>
          {expanded ? (
            <Text look="caption" tone="muted">
              {detail}
            </Text>
          ) : null}
          <button
            type="button"
            css={[
              typeRole.caption,
              buttonReset.base,
              corner.radius_1,
              styles.hintToggle,
            ]}
            onClick={() => {
              setExpanded(!expanded);
            }}
          >
            {expanded
              ? t({ en: "Show less", zh: "收起" })
              : t({ en: "Show more", zh: "展开" })}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function UsePopoverSection() {
  return (
    <Showcase label="usePopover" labelLook="code">
      <ShowcaseHelper>
        {t({
          en: "The headless layer beneath `Popover`, which is this hook plus a portal and the shared surface skin: it owns the open state, the placement, the dismissal rules, and the ARIA wiring, then hands back `triggerProps` and `contentProps` to spread onto your own elements. Placement is measured against the viewport rather than the trigger's corner — the side flips when it would overflow, both axes shift to stay on screen, and it re-places on scroll, on window resize, and whenever the trigger or the popup itself changes size. It moves focus into the popup on open and gives it back to the trigger on close, but it never traps focus and never locks scroll. Reach for it when the popup has to be something other than a padded surface — the element is yours to render, and it must be `position: fixed`, because the hook writes `top`/`left` straight to the node.",
          zh: "`Popover` 之下的无头层——`Popover` 就是这个钩子加上 portal 与共享的表面皮肤：它负责开合状态、定位、关闭时机与 ARIA 关联，再把 `triggerProps` 与 `contentProps` 交还给你，由你铺到自己的元素上。定位以视口为准，而非贴着触发元素的角落——放不下时会翻到对侧，两个轴向都会平移以留在屏幕内，并在滚动、窗口尺寸变化，以及触发元素或弹出层自身尺寸变化时重新定位。打开时它把焦点移入弹出层，关闭时再交还给触发元素，但它既不困陷焦点，也不锁定滚动。当弹出层需要的不是一块带内边距的表面时就用它——元素由你渲染，并且必须是 `position: fixed`，因为钩子会把 `top`/`left` 直接写到节点上。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={hooksSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "Your own popup — a bare colour grid, not a padded surface",
            zh: "由你渲染的弹出层——一片纯色方格，而非带内边距的表面",
          })}
        >
          <IntentPickerSpecimen />
        </Specimen>
        <Specimen
          caption={t({
            en: "Placed above; expand the panel and it re-places itself",
            zh: "置于上方；展开面板后它会重新定位",
          })}
        >
          <PlacementSpecimen />
        </Specimen>
      </SpecimenGrid>
      <UsageSnippet
        code={`import { usePopover } from "@tuja/ui/hooks/use-popover";

// placement defaults to "bottom-start", offset to 8
const { open, setOpen, toggle, triggerProps, contentProps } = usePopover({
  placement: "top-start",
});

<button {...triggerProps}>What is this?</button>
{open ? (
  // position: fixed — the hook writes top/left onto this node
  <div {...contentProps} css={styles.popup}>{/* your markup */}</div>
) : null}`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  alignStart: {
    alignItems: "flex-start",
  },
  // usePopover
  intentTrigger: {
    gap: controlSize._2,
    paddingBlock: space._1,
    paddingInline: space._3,
    color: color.fg,
    backgroundColor: {
      default: color.bgControl,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgControlHover,
      },
    },
    boxShadow: `inset 0 0 0 1px ${color.border}`,
    whiteSpace: "nowrap",
    cursor: "pointer",
  },
  intentDot: {
    inlineSize: "12px",
    blockSize: "12px",
    flexShrink: 0,
  },
  // `fixed` is the hook's one requirement — it writes `top`/`left` onto the
  // node. No portal and no surface skin here: both belong to `Popover`.
  pickerPopup: {
    position: "fixed",
    zIndex: layer.tooltip,
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    // The hairline grid is the border colour showing through the gaps.
    gap: gridlineTokens.width,
    overflow: "hidden",
    backgroundColor: color.border,
    boxShadow: shadow._5,
  },
  pickerCell: {
    inlineSize: "44px",
    blockSize: "36px",
    cursor: "pointer",
  },
  // Two rings so the mark survives every hue in both themes: the overlay colour
  // reads on the saturated fills, the text colour on the pale neutral one.
  pickerCellSelected: {
    boxShadow: `inset 0 0 0 3px ${color.bgSurfaceRaised}, inset 0 0 0 4px ${color.fg}`,
  },
  hintTrigger: {
    paddingBlock: space._1,
    color: {
      default: color.fgMuted,
      ":hover": { default: null, [pointer.canHover]: color.fg },
    },
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
    textUnderlineOffset: "3px",
    textAlign: "start",
    cursor: "pointer",
  },
  hintPopup: {
    position: "fixed",
    zIndex: layer.tooltip,
    gap: rhythm.tight,
    alignItems: "flex-start",
    boxSizing: "border-box",
    maxInlineSize: "260px",
    paddingBlock: space._2,
    paddingInline: space._3,
  },
  hintToggle: {
    paddingBlock: space._00,
    paddingInline: space._1,

    marginInlineStart: `calc(-1 * ${space._1})`,
    fontWeight: font.weight_6,
    color: color.fgAccent,
    cursor: "pointer",
  },
});

/** Keyed by intent so the picker can look a fill up by value. */
const intentFill = stylex.create({
  accent: { backgroundColor: color.bgAccent },
  info: { backgroundColor: color.bgInfo },
  success: { backgroundColor: color.bgSuccess },
  warning: { backgroundColor: color.bgWarning },
  danger: { backgroundColor: color.bgDanger },
  neutral: { backgroundColor: color.bgNeutral },
});
