"use client";

import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, rhythm } from "@tuja/ui/tokens.stylex";
import type { ChecklistItem } from "../report/own-todo.ts";

/** How far a checklist has come, such as 2/5. Nothing when it has no steps. */
export function checklistProgress(steps: readonly ChecklistItem[]) {
  return steps.length === 0
    ? undefined
    : `${String(steps.filter((step) => step.done).length)}/${String(steps.length)}`;
}

/** The progress of a to-do's checklist. It opens the checklist where the to-do can change. */
export function ChecklistProgress({
  steps,
  onOpen,
}: {
  steps: readonly ChecklistItem[];
  onOpen?: () => void;
}) {
  const label = t({
    en: "Checklist: {progress} done",
    zh: "清单：已完成 {progress}",
  }).replace("{progress}", checklistProgress(steps) ?? "");
  const content = (
    <>
      <ListChecksIcon weight="bold" aria-hidden />
      <span>{checklistProgress(steps)}</span>
    </>
  );
  return onOpen ? (
    <button
      type="button"
      aria-label={label}
      css={[buttonReset.base, typeRole.caption, styles.label, styles.button]}
      onClick={onOpen}
    >
      {content}
    </button>
  ) : (
    <Text look="caption" tone="muted" aria-label={label} css={styles.label}>
      {content}
    </Text>
  );
}

const styles = stylex.create({
  label: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
  },
  button: {
    color: color.fgMuted,
  },
});
