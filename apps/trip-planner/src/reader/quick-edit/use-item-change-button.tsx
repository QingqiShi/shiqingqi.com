"use client";

import { DotsThreeIcon } from "@phosphor-icons/react/dist/ssr/DotsThree";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { row } from "@tuja/ui/primitives/stack.stylex";
import type { ReactNode } from "react";
import { useQuickEdit } from "./quick-edit-context.ts";

/**
 * The button at the end of a row that opens the quick changes of its item,
 * or undefined for a person who cannot change the trip, so that a slot of a
 * row stays empty.
 */
export function useItemChangeButton(id: string, name: string): ReactNode {
  const quickEdit = useQuickEdit();
  const label = t({ en: "Change {name}", zh: "调整{name}" });
  if (!quickEdit) return undefined;
  return (
    <Button
      look="ghost"
      size="sm"
      icon={<DotsThreeIcon weight="bold" />}
      aria-label={label.replace("{name}", name)}
      onClick={() => {
        quickEdit.open({ kind: "item", id });
      }}
    />
  );
}

/** The change button of an item on a line of its own at the end, for a card whose header cannot hold a control. */
export function ItemChangeLine({ id, name }: { id: string; name: string }) {
  const button = useItemChangeButton(id, name);
  if (!button) return null;
  return <div css={[row.tight, styles.end]}>{button}</div>;
}

const styles = stylex.create({
  end: {
    justifyContent: "flex-end",
  },
});
