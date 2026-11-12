"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { EffectCarrier } from "@tuja/ui/components/effect-carrier";
import { useEffectSticky } from "@tuja/ui/hooks/use-effect-sticky";
import { layer, space } from "@tuja/ui/tokens.stylex";
import { FloatingActions } from "../shell/floating-actions.tsx";
import type { TransactionForm } from "./use-transaction-form.ts";

/**
 * The end padding of the pane and the sheet that hold the editor, without the
 * safe area. The floating actions move down into it, because a sticky box
 * stops at the scroller's padding edge.
 */
const PANE_END_GAP = space._7;

export function EditorFooter({ form }: { form: TransactionForm }) {
  const { column, isNew, isExpected, paidToday, save, remove } = form;
  const footerSticky = useEffectSticky();
  const { ref: footerStickyRef, css: footerStickyCss } = footerSticky;
  const saveLabel = paidToday
    ? t({ en: "Paid today", zh: "今天已付" })
    : isExpected
      ? t({ en: "Confirm", zh: "确认" })
      : t({ en: "Save", zh: "保存" });

  const secondaryAction = isNew ? (
    <Button
      onClick={() => {
        save(true);
      }}
    >
      {t({ en: "Save and add another", zh: "保存并再记一笔" })}
    </Button>
  ) : isExpected ? (
    <Button onClick={remove}>{t({ en: "Skip", zh: "跳过" })}</Button>
  ) : null;

  return (
    <FloatingActions
      ref={footerStickyRef}
      css={[styles.footer, column !== null && styles.inColumn, footerStickyCss]}
    >
      <EffectCarrier value={footerSticky}>
        {secondaryAction}
        <Button
          type="submit"
          look="primary"
          size={secondaryAction ? "md" : "lg"}
        >
          {saveLabel}
        </Button>
      </EffectCarrier>
    </FloatingActions>
  );
}

const styles = stylex.create({
  footer: {
    position: "sticky",
    insetBlockEnd: `calc(${space._3} - ${PANE_END_GAP})`,
    zIndex: layer.raised,
  },
  // A column has no end padding for the actions to move into.
  inColumn: {
    insetBlockEnd: space._3,
  },
});
