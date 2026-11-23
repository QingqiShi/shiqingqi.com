"use client";

import { Text } from "@tuja/ui/components/text";
import { formatMoney } from "./format-money.ts";
import { formatPercent } from "./format-percent.ts";
import { toneOf } from "./tone-of.ts";

/** A profit or a loss with its sign, green or red, and its percentage when given. */
export function SignedMoney({
  amountGbp,
  pct,
  look = "bodySmall",
}: {
  amountGbp: number;
  pct?: number;
  look?: "body" | "bodySmall" | "caption";
}) {
  const tone = toneOf(amountGbp, 2);
  // A coloured amount keeps its percentage from showing as a bare 0.0%.
  const pctDigits =
    pct !== undefined && tone !== "default" && toneOf(pct, 1) === "default"
      ? 2
      : 1;
  return (
    <Text
      as="span"
      look={look}
      numeric
      wrap="nowrap"
      tone={tone === "default" ? "muted" : tone}
    >
      {formatMoney(amountGbp, { signed: true })}
      {pct === undefined
        ? null
        : ` (${formatPercent(pct, { signed: true, digits: pctDigits })})`}
    </Text>
  );
}
