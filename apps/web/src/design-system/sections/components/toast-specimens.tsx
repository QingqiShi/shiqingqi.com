"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Text } from "@tuja/ui/components/text";
import { Toast } from "@tuja/ui/components/toast";
import { ToastProvider, useToast } from "@tuja/ui/components/toast-provider";
import { usePortalTarget } from "@tuja/ui/hooks/use-portal-target";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import {
  border,
  color,
  controlSize,
  rhythm,
  space,
} from "@tuja/ui/tokens.stylex";
import { useState } from "react";

function noop() {}

/**
 * A live toast: deleting the row shows one with Undo, which brings the row
 * back. The provider sits here rather than in the page shell, so only this
 * demo can show a toast.
 */
export function ToastDemo() {
  const portalTarget = usePortalTarget();
  return (
    <ToastProvider
      dismissLabel={t({ en: "Dismiss", zh: "关闭" })}
      portalTarget={portalTarget}
    >
      <TransactionRow />
    </ToastProvider>
  );
}

function TransactionRow() {
  const show = useToast();
  const [deleted, setDeleted] = useState(false);
  const payee = t({ en: "Coffee with Sam", zh: "和Sam喝咖啡" });
  const amount = t({ en: "£3.20", zh: "£3.20" });
  const deletedMessage = t({ en: "Transaction deleted", zh: "交易已删除" });
  const undoLabel = t({ en: "Undo", zh: "撤销" });
  const deleteLabel = t({ en: "Delete", zh: "删除" });
  const emptyLabel = t({ en: "No transactions", zh: "没有交易" });
  const savedMessage = t({ en: "Draft saved", zh: "草稿已保存" });
  const saveLabel = t({ en: "Save draft", zh: "保存草稿" });

  return (
    <div css={[stack.item, styles.demo]}>
      <div css={[corner.radius_3, styles.row]}>
        {deleted ? (
          <Text tone="muted">{emptyLabel}</Text>
        ) : (
          <>
            <span css={stack.text}>
              <Text as="span">{payee}</Text>
              <Text as="span" look="bodySmall" tone="muted">
                {amount}
              </Text>
            </span>
            <Button
              size="sm"
              look="outline"
              onClick={() => {
                setDeleted(true);
                show({
                  message: deletedMessage,
                  action: {
                    label: undoLabel,
                    onAction: () => {
                      setDeleted(false);
                    },
                  },
                });
              }}
            >
              {deleteLabel}
            </Button>
          </>
        )}
      </div>
      <div css={cluster.item}>
        <Button
          onClick={() => {
            show({ message: savedMessage });
          }}
        >
          {saveLabel}
        </Button>
      </div>
    </div>
  );
}

/** The surface on its own, with Undo and a close button. */
export function UndoToastSpecimen() {
  return (
    <Toast
      message={t({ en: "Transaction deleted", zh: "交易已删除" })}
      action={{ label: t({ en: "Undo", zh: "撤销" }), onAction: noop }}
      onDismiss={noop}
      dismissLabel={t({ en: "Dismiss", zh: "关闭" })}
    />
  );
}

/** The surface with a message and nothing else. */
export function MessageToastSpecimen() {
  return <Toast message={t({ en: "Link copied", zh: "链接已复制" })} />;
}

/** A message too long for one line keeps the capsule's corners. */
export function WrappingToastSpecimen() {
  return (
    <Toast
      css={styles.narrow}
      message={t({
        en: "3 transactions moved to Groceries",
        zh: "3笔交易已移到“日用杂货”",
      })}
      action={{ label: t({ en: "Undo", zh: "撤销" }), onAction: noop }}
      onDismiss={noop}
      dismissLabel={t({ en: "Dismiss", zh: "关闭" })}
    />
  );
}

/** The anti-pattern for the guidelines: an error a toast takes away. */
export function ErrorToastSpecimen() {
  return (
    <Toast
      message={t({
        en: "Payment failed. Update your card to keep your plan.",
        zh: "付款失败。更新银行卡即可保留套餐。",
      })}
    />
  );
}

const styles = stylex.create({
  demo: {
    inlineSize: "100%",
    maxInlineSize: space._15,
  },
  row: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.item,
    minBlockSize: `calc(${controlSize._8} + 2 * ${space._2})`,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  narrow: {
    maxInlineSize: space._14,
  },
});
