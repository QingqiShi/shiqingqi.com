"use client";
import * as stylex from "@stylexjs/stylex";
import { buttonTokens } from "#src/components/shared/button.stylex.ts";
import { Button } from "#src/components/shared/button.tsx";
import { t } from "#src/i18n.ts";
import { flex } from "#src/primitives/flex.stylex.ts";
import { border, color, ratio } from "#src/tokens.stylex.ts";

interface CalculatorButtonProps {
  label: string;
  isZero?: boolean;
  isRowEnd?: boolean;
  onClick: () => void;
}

function getLabelDescription(label: string): string {
  switch (label) {
    case "ac":
      return t({ en: "All clear", zh: "全部清除" });
    case "±":
      return t({ en: "Toggle sign", zh: "切换正负" });
    case "%":
      return t({ en: "Percent", zh: "百分比" });
    case "÷":
      return t({ en: "Divide", zh: "除以" });
    case "×":
      return t({ en: "Multiply", zh: "乘以" });
    case "−":
      return t({ en: "Subtract", zh: "减去" });
    case "+":
      return t({ en: "Add", zh: "加上" });
    case "=":
      return t({ en: "Equals", zh: "等于" });
    case ".":
      return t({ en: "Decimal point", zh: "小数点" });
    default:
      return label;
  }
}

export function CalculatorButton({
  label,
  isZero = false,
  isRowEnd = false,
  onClick,
}: CalculatorButtonProps) {
  return (
    <div css={isZero && styles.zeroContainer}>
      <Button
        css={[
          flex.center,
          styles.button,
          isZero && styles.zeroButton,
          isRowEnd && styles.rowEndButton,
        ]}
        onClick={onClick}
        aria-label={getLabelDescription(label)}
      >
        <span css={styles.buttonLabel}>{label}</span>
      </Button>
    </div>
  );
}

const styles = stylex.create({
  zeroContainer: {
    gridColumn: "span 2",
  },
  button: {
    height: "100%",
    aspectRatio: ratio.square,
    borderRadius: border.radius_round,
    borderWidth: 0,
    appearance: "unset",
    textTransform: "uppercase",
    [buttonTokens.backgroundColor]: color.backgroundCalculatorButton,
    [buttonTokens.backgroundColorHover]: color.backgroundCalculatorButton,
    filter: { ":hover": "brightness(1.1)" },
    outline: {
      ":focus-visible": `2px solid ${color.brandCalculator}`,
    },
    outlineOffset: {
      ":focus-visible": "2px",
    },
  },
  buttonLabel: {
    fontSize: "calc(100cqMin / 15)",
  },
  zeroButton: {
    borderRadius: "50cqh",
    width: "100%",
    height: "100%",
    aspectRatio: null,
  },
  rowEndButton: {
    backgroundColor: color.brandCalculator,
    [buttonTokens.backgroundColor]: color.brandCalculator,
    [buttonTokens.backgroundColorHover]: color.brandCalculator,
  },
});
