"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { row } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { useEditor } from "./editor-provider.tsx";

/** Adds the thing of the form, and keeps the sheet open on the form of one more. */
export function AddAnotherButton({ onClick }: { onClick: () => void }) {
  const { canEdit } = useEditor();
  return (
    <Button type="button" disabled={!canEdit} onClick={onClick}>
      {t({ en: "Add and add another", zh: "添加并继续" })}
    </Button>
  );
}

/**
 * The actions at the end of a sheet: the one that removes at the start of
 * the line, the others at its end. The line stays at the bottom of the
 * sheet while a long form scrolls behind it.
 */
export function SheetActions({
  remove,
  children,
}: {
  remove?: ReactNode;
  children: ReactNode;
}) {
  return (
    <StickyControls css={styles.actions}>
      {remove ? <StickyControlGroup>{remove}</StickyControlGroup> : null}
      <StickyControlGroup css={[row.tight, styles.main]}>
        {children}
      </StickyControlGroup>
    </StickyControls>
  );
}

// The end padding of the content of a `Sheet`.
const SHEET_END_GAP = space._7;

const styles = stylex.create({
  // A sticky box stops at the padding edge of the box that scrolls, so the
  // line moves down into the end padding of the sheet.
  actions: {
    insetBlockStart: "auto",
    insetBlockEnd: `calc(${space._3} - ${SHEET_END_GAP})`,
  },
  main: {
    marginInlineStart: "auto",
  },
});
