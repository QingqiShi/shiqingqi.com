"use client";

import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { rhythm } from "@tuja/ui/tokens.stylex";
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
  return onOpen ? (
    <Button
      look="ghost"
      size="xs"
      icon={<ListChecksIcon weight="bold" />}
      aria-label={label}
      onClick={onOpen}
    >
      {checklistProgress(steps)}
    </Button>
  ) : (
    <Text look="caption" tone="muted" aria-label={label} css={styles.label}>
      <ListChecksIcon weight="bold" aria-hidden />
      <span>{checklistProgress(steps)}</span>
    </Text>
  );
}

const styles = stylex.create({
  label: {
    display: "inline-flex",
    alignItems: "center",
    gap: rhythm.inline,
  },
});
