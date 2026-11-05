"use client";

import { ArrowCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowCounterClockwise";
import { ArrowUUpLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpLeft";
import { ArrowUUpRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowUUpRight";
import { EraserIcon } from "@phosphor-icons/react/dist/ssr/Eraser";
import { EyedropperIcon } from "@phosphor-icons/react/dist/ssr/Eyedropper";
import { FrameCornersIcon } from "@phosphor-icons/react/dist/ssr/FrameCorners";
import { MagicWandIcon } from "@phosphor-icons/react/dist/ssr/MagicWand";
import { PaintBucketIcon } from "@phosphor-icons/react/dist/ssr/PaintBucket";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { SelectionIcon } from "@phosphor-icons/react/dist/ssr/Selection";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { a11y } from "@tuja/ui/primitives/a11y.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import {
  duration,
  easing,
  motionConstants,
} from "@tuja/ui/primitives/motion.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { selectedTokens } from "@tuja/ui/primitives/selected.stylex";
import {
  border,
  controlSize,
  opacity,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import type { Tool } from "./types";

interface EditorToolbarProps {
  tool: Tool;
  onSwitchTool: (next: Tool) => void;
  onFit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onRevert: () => void;
}

export function EditorToolbar({
  tool,
  onSwitchTool,
  onFit,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onRevert,
}: EditorToolbarProps) {
  return (
    <div
      css={[corner.radius_2, styles.toolbar]}
      role="toolbar"
      aria-label={t({ en: "Tools", zh: "工具" })}
    >
      <ToolButton
        icon={<PencilSimpleIcon weight="bold" />}
        label={t({ en: "Pencil", zh: "铅笔" })}
        active={tool === "pencil"}
        onClick={() => {
          onSwitchTool("pencil");
        }}
        testId="tool-pencil"
      />
      <ToolButton
        icon={<EraserIcon weight="bold" />}
        label={t({ en: "Eraser", zh: "橡皮" })}
        active={tool === "eraser"}
        onClick={() => {
          onSwitchTool("eraser");
        }}
        testId="tool-eraser"
      />
      <ToolButton
        icon={<SelectionIcon weight="bold" />}
        label={t({ en: "Range select", zh: "区域选择" })}
        active={tool === "select"}
        onClick={() => {
          onSwitchTool("select");
        }}
        testId="tool-select"
      />
      <ToolButton
        icon={<EyedropperIcon weight="bold" />}
        label={t({ en: "Eyedropper", zh: "取色" })}
        active={tool === "eyedropper"}
        onClick={() => {
          onSwitchTool("eyedropper");
        }}
        testId="tool-eyedropper"
      />
      <ToolButton
        icon={<PaintBucketIcon weight="bold" />}
        label={t({ en: "Fill", zh: "填充" })}
        active={tool === "fill"}
        onClick={() => {
          onSwitchTool("fill");
        }}
        testId="tool-fill"
      />
      <ToolButton
        icon={<MagicWandIcon weight="bold" />}
        label={t({ en: "Remove background", zh: "去背景" })}
        active={tool === "bg-remove"}
        onClick={() => {
          onSwitchTool("bg-remove");
        }}
        testId="tool-bg-remove"
      />
      <span css={styles.spacer} />
      <ToolButton
        icon={<FrameCornersIcon weight="bold" />}
        label={t({ en: "Fit view", zh: "适应视图" })}
        onClick={onFit}
        testId="tool-fit"
      />
      <ToolButton
        icon={<ArrowUUpLeftIcon weight="bold" />}
        label={t({ en: "Undo", zh: "撤销" })}
        onClick={onUndo}
        disabled={!canUndo}
        testId="tool-undo"
      />
      <ToolButton
        icon={<ArrowUUpRightIcon weight="bold" />}
        label={t({ en: "Redo", zh: "重做" })}
        onClick={onRedo}
        disabled={!canRedo}
        testId="tool-redo"
      />
      <ToolButton
        icon={<ArrowCounterClockwiseIcon weight="bold" />}
        label={t({ en: "Revert", zh: "还原" })}
        onClick={onRevert}
        testId="tool-revert"
      />
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  testId?: string;
}

function ToolButton({
  icon,
  label,
  active,
  disabled,
  onClick,
  testId,
}: ToolButtonProps) {
  return (
    <button
      type="button"
      css={[
        buttonReset.base,
        corner.radius_2,
        quietSurface.interactive,
        a11y.focusRing,
        styles.toolButton,
      ]}
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      data-testid={testId}
    >
      {icon}
    </button>
  );
}

const styles = stylex.create({
  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: rhythm.tight,
    padding: space._2,
    backgroundColor: color.bgSurface,
    border: `${border.size_1} solid ${color.border}`,
  },
  spacer: {
    flex: "1",
  },
  toolButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    fontSize: controlSize._4,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    [selectedTokens.rest]: color.bgControl,
    color: color.fg,
    cursor: { default: "pointer", ":disabled": "not-allowed" },
    opacity: { default: 1, ":disabled": opacity.disabled },
    transition: {
      default: `background-color ${duration._150} ${easing.easeOut}, border-color ${duration._150} ${easing.easeOut}, color ${duration._150} ${easing.easeOut}`,
      [motionConstants.REDUCED_MOTION]: "none",
    },
  },
});
