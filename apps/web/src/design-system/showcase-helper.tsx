import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { measure } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { onReadingColumn } from "./reading-column.stylex.ts";

interface ShowcaseHelperProps {
  children: ReactNode;
}

export function ShowcaseHelper({ children }: ShowcaseHelperProps) {
  return (
    <Text
      look="caption"
      tone="muted"
      css={[styles.helper, onReadingColumn.base]}
    >
      {children}
    </Text>
  );
}

const styles = stylex.create({
  helper: {
    maxInlineSize: measure.prose,
  },
});
