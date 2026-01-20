"use client";
import * as stylex from "@stylexjs/stylex";
import { buttonTokens } from "#src/components/shared/button.stylex.ts";
import { Button } from "#src/components/shared/button.tsx";
import { border, color, ratio } from "#src/tokens.stylex.ts";

interface CalculatorButtonProps {
  label: string;
  isZero?: boolean;
  isRowEnd?: boolean;
  onClick: () => void;
}

const labelDescriptions: Record<string, string> = {
  ac: "All clear",
  "±": "Toggle sign",
  "%": "Percent",
  "÷": "Divide",
  "×": "Multiply",
  "−": "Subtract",
  "+": "Add",
  "=": "Equals",
  ".": "Decimal point",
};

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
          styles.button,
          isZero && styles.zeroButton,
          isRowEnd && styles.rowEndButton,
        ]}
        onClick={onClick}
        aria-label={labelDescriptions[label] ?? label}
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
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
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
