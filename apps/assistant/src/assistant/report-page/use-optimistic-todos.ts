import { t } from "@tuja/i18n";
import {
  useToast,
  type ToastOptions,
} from "@tuja/ui/components/toast-provider";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { refreshAfterSave } from "../shell/refresh-after-save.ts";
import type { TodoOp, TodoRows } from "./patch-row.ts";

interface PendingOp {
  key: number;
  op: TodoOp;
}

export type RunTodoOp = (
  op: TodoOp,
  request: () => Promise<unknown>,
  refusalToast?: (error: unknown, retry: () => void) => ToastOptions,
) => void;

/**
 * Makes the function that shows a change at once and sends the requests one by
 * one, in the order of the changes. A refused change goes away, and the
 * changes after it stay. `onRefused` gets a way to try the change again.
 */
function createOpRunner(
  setPending: Dispatch<SetStateAction<readonly PendingOp[]>>,
  setConfirmed: Dispatch<SetStateAction<TodoRows>>,
  setSavedAt: Dispatch<SetStateAction<number>>,
) {
  let nextKey = 0;
  let queue = Promise.resolve();
  function runOp(
    op: TodoOp,
    request: () => Promise<unknown>,
    onSent: (save: Promise<unknown>) => void,
    onRefused: (error: unknown, retry: () => void) => void,
  ) {
    const key = nextKey;
    nextKey += 1;
    const settle = () => {
      setPending((list) => list.filter((entry) => entry.key !== key));
    };
    setPending((list) => [...list, { key, op }]);
    queue = queue.then(request).then(
      () => {
        setSavedAt(Date.now());
        setConfirmed((rows) => op(rows));
        settle();
      },
      (error: unknown) => {
        settle();
        onRefused(error, () => {
          runOp(op, request, onSent, onRefused);
        });
      },
    );
    onSent(queue);
  }
  return runOp;
}

export function useOptimisticTodos({
  todos,
  renderedAt,
  refreshesOnLeave,
}: {
  todos: TodoRows;
  renderedAt: number;
  refreshesOnLeave: boolean;
}) {
  const showToast = useToast();
  const router = useRouter();
  const [seenTodos, setSeenTodos] = useState(todos);
  const [confirmed, setConfirmed] = useState(todos);
  const [savedAt, setSavedAt] = useState(0);
  const [pending, setPending] = useState<readonly PendingOp[]>([]);
  const [runOp] = useState(() =>
    createOpRunner(setPending, setConfirmed, setSavedAt),
  );
  const lastSaveRef = useRef<Promise<unknown> | null>(null);

  useEffect(
    () => () => {
      if (lastSaveRef.current === null) return;
      refreshAfterSave(lastSaveRef.current, () => {
        router.refresh();
      });
    },
    [router],
  );

  function clearCachedPagesAfter(save: Promise<unknown>) {
    if (refreshesOnLeave) {
      lastSaveRef.current = save;
      return;
    }
    refreshAfterSave(save, () => {
      router.refresh();
    });
  }

  // New rows from the server replace the list, and the changes that it does
  // not know of yet stay on top. A refresh that began before the last save can
  // land after it, and then its rows are older than the list. The clocks of the
  // server and the browser can differ, but then only a replacement comes late.
  if (seenTodos !== todos) {
    setSeenTodos(todos);
    if (renderedAt >= savedAt) setConfirmed(todos);
  }

  const copy = {
    failed: t({
      en: "That did not save, so it is back as it was.",
      zh: "没有保存成功，已恢复原样。",
    }),
    retry: t({ en: "Try again", zh: "重试" }),
  };

  function run(
    op: TodoOp,
    request: () => Promise<unknown>,
    refusalToast?: (error: unknown, retry: () => void) => ToastOptions,
  ) {
    runOp(op, request, clearCachedPagesAfter, (error, retry) => {
      showToast(
        refusalToast?.(error, retry) ?? {
          message: copy.failed,
          action: { label: copy.retry, onAction: retry },
        },
      );
    });
  }

  const rows = pending.reduce<TodoRows>((list, { op }) => op(list), confirmed);

  return { rows, run };
}
