"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { FlipHorizontalIcon } from "@phosphor-icons/react/dist/ssr/FlipHorizontal";
import { FlipVerticalIcon } from "@phosphor-icons/react/dist/ssr/FlipVertical";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { pointer } from "@tuja/ui/breakpoints.stylex";
import { color } from "@tuja/ui/color.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { quietSurface } from "@tuja/ui/primitives/quiet-surface.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, controlSize, font, space } from "@tuja/ui/tokens.stylex";

interface SelectionBarProps {
  onErase: () => void;
  onCopy: () => void;
  onFlip: (axis: "h" | "v") => void;
  onApply: () => void;
  onCancel: () => void;
}

export function SelectionBar({
  onErase,
  onCopy,
  onFlip,
  onApply,
  onCancel,
}: SelectionBarProps) {
  const flipHLabel = t({ en: "Flip horizontal", zh: "水平翻转" });
  const flipVLabel = t({ en: "Flip vertical", zh: "垂直翻转" });
  const eraseLabel = t({ en: "Erase", zh: "擦除" });
  const copyLabel = t({ en: "Copy", zh: "复制" });
  const applyLabel = t({ en: "Apply", zh: "应用" });
  const cancelLabel = t({ en: "Cancel", zh: "取消" });

  return (
    <div
      css={[corner.radius_2, styles.selectionBar]}
      role="toolbar"
      aria-label={t({ en: "Selection actions", zh: "选区操作" })}
    >
      <SelectionButton
        icon={<TrashIcon weight="bold" />}
        label={eraseLabel}
        onClick={onErase}
        testId="selection-erase"
      />
      <SelectionButton
        icon={<CopyIcon weight="bold" />}
        label={copyLabel}
        onClick={onCopy}
        testId="selection-copy"
      />
      <SelectionButton
        icon={<FlipHorizontalIcon weight="bold" />}
        label={flipHLabel}
        onClick={() => {
          onFlip("h");
        }}
        testId="selection-flip-h"
      />
      <SelectionButton
        icon={<FlipVerticalIcon weight="bold" />}
        label={flipVLabel}
        onClick={() => {
          onFlip("v");
        }}
        testId="selection-flip-v"
      />
      <span css={styles.selectionDivider} aria-hidden="true" />
      <SelectionButton
        icon={<CheckIcon weight="bold" />}
        label={applyLabel}
        onClick={onApply}
        testId="selection-apply"
        variant="primary"
      />
      <SelectionButton
        icon={<XIcon weight="bold" />}
        label={cancelLabel}
        onClick={onCancel}
        testId="selection-cancel"
      />
    </div>
  );
}

interface SelectionButtonProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  testId?: string;
  variant?: "primary";
}

function SelectionButton({
  icon,
  label,
  onClick,
  testId,
  variant,
}: SelectionButtonProps) {
  return (
    <button
      type="button"
      css={[
        buttonReset.base,
        typeRole.label,
        corner.radius_1,
        quietSurface.interactive,
        styles.selectionButton,
        variant === "primary" && styles.selectionButtonPrimary,
      ]}
      onClick={onClick}
      data-testid={testId}
    >
      <span css={styles.selectionIcon} aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

const styles = stylex.create({
  selectionBar: {
    position: "absolute",
    insetBlockStart: space._2,
    insetInlineStart: "50%",
    transform: "translateX(-50%)",
    display: "flex",
    alignItems: "center",
    gap: controlSize._0,
    padding: "4px",
    backgroundColor: color.bgSurfaceRaised,
    border: `${border.size_1} solid ${color.border}`,
    boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
    flexWrap: "wrap",
    maxInlineSize: "calc(100% - 24px)",
    justifyContent: "center",
  },
  selectionButton: {
    display: "inline-flex",
    alignItems: "center",
    gap: controlSize._1,
    paddingBlock: "4px",
    paddingInline: space._1,
    color: color.fg,
    fontFamily: "inherit",
    fontWeight: font.weight_6,
  },
  selectionButtonPrimary: {
    backgroundColor: {
      default: color.bgAccent,
      ":hover": {
        default: null,
        [pointer.canHover]: color.bgAccentHover,
      },
    },
    color: color.fgOnAccent,
  },
  selectionIcon: {
    display: "inline-flex",
    fontSize: controlSize._4,
  },
  selectionDivider: {
    width: "1px",
    height: "18px",
    backgroundColor: color.border,
    marginInline: controlSize._0,
  },
});
