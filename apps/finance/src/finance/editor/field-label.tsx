"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Badge } from "@tuja/ui/components/badge";
import { cluster } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";

/** The mark beside a field's name: where its value came from, a value to check, or a value a save needs. */
export type LabelMark =
  | { type: "ai" }
  | { type: "lastTime" }
  /** `runnerUp` is the next best value, as the Member reads it. */
  | { type: "unsure"; runnerUp?: string }
  | { type: "missing" };

/** A quiet badge for a value the AI or the last time gave, a warning badge for a value to check, and an outlined one for a value a save needs. */
export function MarkBadge({ mark }: { mark: LabelMark }) {
  const notSure = t({ en: "Not sure", zh: "不确定" });
  const or = t({ en: "or", zh: "或" });
  switch (mark.type) {
    case "ai":
      return (
        <Badge intent="neutral" size="sm">
          {t({ en: "AI", zh: "AI" })}
        </Badge>
      );
    case "lastTime":
      return (
        <Badge intent="neutral" size="sm">
          {t({ en: "From last time", zh: "沿用上次" })}
        </Badge>
      );
    case "unsure":
      return (
        <Badge intent="warning" size="sm">
          {mark.runnerUp === undefined
            ? notSure
            : `${notSure} · ${or} ${mark.runnerUp}`}
        </Badge>
      );
    case "missing":
      return (
        <Badge intent="default" size="sm">
          {t({ en: "Missing", zh: "缺少" })}
        </Badge>
      );
  }
}

interface FieldLabelProps {
  id?: string;
  mark?: LabelMark;
  children: ReactNode;
}

/** The name above an editor field, with the mark of where its value came from. */
export function FieldLabel({ id, mark, children }: FieldLabelProps) {
  return (
    <span css={cluster.tight}>
      <span id={id} css={[typeRole.control, styles.label]}>
        {children}
      </span>
      {mark ? <MarkBadge mark={mark} /> : null}
    </span>
  );
}

const styles = stylex.create({
  label: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
});
