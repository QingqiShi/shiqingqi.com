"use client";

import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { tabViewTokens } from "@tuja/ui/components/tab-view.stylex";
import { Text } from "@tuja/ui/components/text";
import { ToastProvider, useToast } from "@tuja/ui/components/toast-provider";
import { toastTokens } from "@tuja/ui/components/toast.stylex";
import { typeModifier } from "@tuja/ui/primitives/type.stylex";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { assistantFetch } from "../http/assistant-fetch.ts";
import { refreshAfterSave } from "../shell/refresh-after-save.ts";

export interface RejectedTodoEntry {
  id: string;
  title: string;
  note: string | null;
}

function Entries({ todos }: { todos: readonly RejectedTodoEntry[] }) {
  const showToast = useToast();
  const router = useRouter();
  const [removed, setRemoved] = useState<readonly string[]>([]);
  const [broughtBack, setBroughtBack] = useState<readonly RejectedTodoEntry[]>(
    [],
  );
  const lastSaveRef = useRef<Promise<unknown>>(Promise.resolve());

  const copy = {
    failed: t({
      en: "That did not save, so it is back as it was.",
      zh: "没有保存成功，已恢复原样。",
    }),
    retry: t({ en: "Try again", zh: "重试" }),
    removed: t({
      en: "Removed. The report can add this kind of to-do again",
      zh: "已移除，晨报可以再添加这类待办",
    }),
    undo: t({ en: "Undo", zh: "撤销" }),
    remove: t({ en: "Remove", zh: "移除" }),
    removeOne: t({ en: "Remove “{title}”", zh: "移除“{title}”" }),
  };

  function send(request: () => Promise<unknown>, rollback: () => void) {
    const attempt = () => {
      const save = lastSaveRef.current.then(request).catch(() => {
        rollback();
        showToast({
          message: copy.failed,
          action: { label: copy.retry, onAction: attempt },
        });
      });
      lastSaveRef.current = save;
      refreshAfterSave(save, () => {
        router.refresh();
      });
    };
    attempt();
  }

  function bringBack(entry: RejectedTodoEntry) {
    setRemoved((ids) => ids.filter((id) => id !== entry.id));
    setBroughtBack((list) => [entry, ...list]);
    send(
      () =>
        assistantFetch("/api/todos/bulk", {
          method: "POST",
          body: JSON.stringify({
            action: "reject",
            ids: [entry.id],
            note: entry.note ?? "",
          }),
        }),
      () => {
        setRemoved((ids) => [...ids, entry.id]);
      },
    );
  }

  function remove(entry: RejectedTodoEntry) {
    setRemoved((ids) => [...ids, entry.id]);
    send(
      () =>
        assistantFetch(`/api/todos/${entry.id}/rejection`, {
          method: "DELETE",
        }),
      () => {
        setRemoved((ids) => ids.filter((id) => id !== entry.id));
      },
    );
    showToast({
      message: copy.removed,
      action: {
        label: copy.undo,
        onAction: () => {
          bringBack(entry);
        },
      },
    });
  }

  const known = new Set(todos.map(({ id }) => id));
  const shown = [
    ...broughtBack.filter(({ id }) => !known.has(id)),
    ...todos,
  ].filter(({ id }) => !removed.includes(id));

  if (shown.length === 0) {
    return (
      <Text as="p" look="bodySmall" tone="muted">
        {t({
          en: "None. When you delete a to-do that the report added, you can say that it should not have been added.",
          zh: "没有。删除晨报添加的待办时，可以说明它不该被添加。",
        })}
      </Text>
    );
  }

  return (
    <List>
      {shown.map((entry) => (
        <ListRow
          key={entry.id}
          wrap
          detail={entry.note}
          actions={
            <Button
              size="sm"
              look="ghost"
              icon={<TrashIcon weight="bold" />}
              hideLabelOnMobile
              aria-label={copy.removeOne.replace("{title}", entry.title)}
              onClick={() => {
                remove(entry);
              }}
            >
              {copy.remove}
            </Button>
          }
        >
          <span css={typeModifier.verbatim}>{entry.title}</span>
        </ListRow>
      ))}
    </List>
  );
}

/** What the owner said the report should not have added, each with a way to take it back. */
export function RejectedTodoList({
  todos,
}: {
  todos: readonly RejectedTodoEntry[];
}) {
  return (
    <ToastProvider
      dismissLabel={t({ en: "Dismiss", zh: "关闭" })}
      css={styles.toasts}
    >
      <Entries todos={todos} />
    </ToastProvider>
  );
}

const styles = stylex.create({
  toasts: {
    [toastTokens.clearance]: tabViewTokens.barClearance,
  },
});
