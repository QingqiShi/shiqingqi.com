"use client";
import * as stylex from "@stylexjs/stylex";
import { space } from "#src/tokens.stylex.ts";
import type { Token } from "./types.ts";

interface CalculatorDisplayProps {
  tokens: Token[];
  currentToken: Token;
}

function formatTokenValue(token: Token): string {
  return Number.isNaN(token.value) ? "Error" : String(token.value);
}

export function CalculatorDisplay({
  tokens,
  currentToken,
}: CalculatorDisplayProps) {
  const displayText = [...tokens, currentToken]
    .map(formatTokenValue)
    .join(" ");

  return (
    <div css={styles.container} role="status" aria-live="polite">
      {displayText}
    </div>
  );
}

const styles = stylex.create({
  container: {
    flexGrow: 1,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    padding: space._3,
    fontSize: "calc(100cqMin / 8)",
  },
});
