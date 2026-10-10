"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { TextField } from "@tuja/ui/components/text-field";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeModifier, typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, rhythm, space } from "@tuja/ui/tokens.stylex";
import { useDeferredValue, useMemo, useRef, useState } from "react";
import type { VirtuosoHandle } from "react-virtuoso";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useBaseCurrency } from "../accounts/use-base-currency.ts";
import { useHouseholdToday } from "../accounts/use-household-today.ts";
import { formatMoney } from "../domain/money/format-money.ts";
import type { EditorDraft } from "../editor/editor-draft.ts";
import {
  TransactionEditor,
  type EditorFocusTarget,
} from "../editor/transaction-editor.tsx";
import { unconfirmMutations } from "../editor/unconfirm-mutations.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import { useReplicaStore } from "../replica/use-replica-store.ts";
import { useReplica } from "../replica/use-replica.ts";
import { PaneSheet } from "../shell/pane-sheet.tsx";
import { useToast } from "../shell/toast-provider.tsx";
import { useIsWideLayout } from "../shell/use-is-wide-layout.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { selectEntriesByTransaction } from "../store/select-entries-by-transaction.ts";
import { selectTagIdsByTransaction } from "../store/select-tag-ids-by-transaction.ts";
import { selectTransactionsByDateDesc } from "../store/select-transactions-by-date-desc.ts";
import type { TransactionRow } from "../sync/row-schemas.ts";
import { buildTransactionList } from "./build-transaction-list.ts";
import { QuickAdd } from "./quick-add.tsx";
import { selectQueueCounts } from "./select-queue-counts.ts";
import { selectTransactionLookups } from "./select-transaction-lookups.ts";
import { TransactionFilterBar } from "./transaction-filter-bar.tsx";
import type { TransactionFilters } from "./transaction-filters.ts";
import type { TransactionRowActions } from "./transaction-list-row.tsx";
import { TransactionList } from "./transaction-list.tsx";
import { useListShortcuts } from "./use-list-shortcuts.ts";
import { useTransactionsUrl } from "./use-transactions-url.ts";

const HIGH_CONFIDENCE = 0.9;

function focusRow(id: string) {
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLElement>(`[data-transaction-id="${CSS.escape(id)}"]`)
      ?.focus();
  });
}

/**
 * The Transactions screen: quick add, search and filters over a virtualised
 * day-grouped list, and the editor beside it at `lg` and wider or in a sheet
 * below. Every filter and the selection live in the URL.
 */
export function TransactionsScreen() {
  const locale = useLocale();
  const url = useTransactionsUrl();
  const store = useReplicaStore();
  const showToast = useToast();
  const isWide = useIsWideLayout();

  const bootstrapped = useReplica((snapshot) => snapshot.bootstrapped);
  const rows = useReplica(selectTransactionsByDateDesc);
  const entriesByTransaction = useReplica(selectEntriesByTransaction);
  const tagIdsByTransaction = useReplica(selectTagIdsByTransaction);
  const lookups = useReplica(selectTransactionLookups);
  const pendingKeys = useReplica((snapshot) => snapshot.pendingKeys);
  const members = useReplica(liveRowSelectors.members);
  const accounts = useReplica(liveRowSelectors.accounts);
  const accountGroups = useReplica(liveRowSelectors.accountGroups);
  const categories = useReplica(liveRowSelectors.categories);
  const counts = useReplica(selectQueueCounts);

  const baseCurrency = useBaseCurrency();
  const today = useHouseholdToday();

  const [query, setQuery] = useState(url.filters.query);
  const [urlQuery, setUrlQuery] = useState(url.filters.query);
  if (url.filters.query !== urlQuery) {
    setUrlQuery(url.filters.query);
    setQuery(url.filters.query);
  }
  const filters = useMemo(
    () => ({ ...url.filters, query }),
    [url.filters, query],
  );
  const deferredFilters = useDeferredValue(filters);
  const [upcomingOpen, setUpcomingOpen] = useState(false);
  const list = useMemo(
    () =>
      buildTransactionList(
        {
          rows,
          entriesByTransaction,
          tagIdsByTransaction,
          categoryDescendantsById: lookups.categoryDescendantsById,
          baseCurrency,
        },
        deferredFilters,
        { today, upcomingOpen },
      ),
    [
      rows,
      entriesByTransaction,
      tagIdsByTransaction,
      lookups,
      baseCurrency,
      deferredFilters,
      today,
      upcomingOpen,
    ],
  );
  const summary = useMemo(() => {
    let spent = 0;
    for (const item of list.items) {
      if (item.type === "day") spent += item.expenseMinor;
    }
    return { count: list.matchCount, spent };
  }, [list]);

  const categoriesByKind = useMemo(
    () => ({
      expense: categories.filter(
        (category) =>
          category.kind === "expense" && category.archivedAt === null,
      ),
      income: categories.filter(
        (category) =>
          category.kind === "income" && category.archivedAt === null,
      ),
    }),
    [categories],
  );

  const [seed, setSeed] = useState<{
    draft: EditorDraft;
    nonce: number;
  } | null>(null);
  const [focusRequest, setFocusRequest] = useState<
    { target: EditorFocusTarget; nonce: number } | undefined
  >(undefined);
  const [cursorId, setCursorId] = useState<string | null>(null);
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const quickAddRef = useRef<HTMLInputElement>(null);
  const focusTargetRef = useRef<HTMLElement | null>(null);

  const undoLabel = t({ en: "Undo", zh: "撤销" });
  const toastConfirmed = t({ en: "Confirmed", zh: "已确认" });
  const toastPaidToday = t({
    en: "Confirmed as paid today",
    zh: "已确认为今天付款",
  });
  const toastSkipped = t({ en: "Skipped", zh: "已跳过" });
  const toastReviewed = t({ en: "Marked as reviewed", zh: "已标记为已审核" });
  const toastDeleted = t({ en: "Deleted", zh: "已删除" });
  const toastAccepted = t({ en: "Accepted", zh: "已接受" });

  const applyWithUndo = (
    mutations: readonly LocalMutationInput[],
    message: string,
    undo: readonly LocalMutationInput[],
  ) => {
    try {
      for (const mutation of mutations) store.applyLocal(mutation);
    } catch {
      return;
    }
    showToast({
      message,
      action:
        undo.length === 0
          ? undefined
          : {
              label: undoLabel,
              onAction: () => {
                try {
                  for (const mutation of undo) store.applyLocal(mutation);
                } catch {
                  // The row changed again since; nothing is left to undo.
                }
              },
            },
    });
  };

  const reviewPatch = (row: TransactionRow, categoryId?: string) => ({
    mutation: {
      name: "updateTransaction" as const,
      args: {
        id: row.id,
        patch: { needsReview: false, ...(categoryId ? { categoryId } : {}) },
      },
    },
    undo: {
      name: "updateTransaction" as const,
      args: {
        id: row.id,
        patch: {
          needsReview: true,
          ...(categoryId ? { categoryId: row.categoryId } : {}),
        },
      },
    },
  });

  const rowActions: TransactionRowActions = {
    hrefFor: (id) => {
      const params = new URLSearchParams(window.location.search);
      params.delete("new");
      params.delete("refund");
      params.set("id", id);
      return `?${params.toString()}`;
    },
    onOpen: (id) => {
      setCursorId(id);
      setFocusRequest(undefined);
      url.open(id);
    },
    onConfirm: (row) => {
      const paidToday = row.date > today;
      applyWithUndo(
        [
          {
            name: "confirmExpected",
            args: paidToday
              ? { id: row.id, patch: { date: today } }
              : { id: row.id },
          },
        ],
        paidToday ? toastPaidToday : toastConfirmed,
        unconfirmMutations({
          transaction: row,
          entries: entriesByTransaction.get(row.id) ?? [],
          tagIds: tagIdsByTransaction.get(row.id) ?? [],
          createId: () => crypto.randomUUID(),
        }),
      );
    },
    onSkip: (row) => {
      applyWithUndo(
        [{ name: "skipExpected", args: { id: row.id } }],
        toastSkipped,
        [{ name: "restoreTransaction", args: { id: row.id } }],
      );
    },
    onLooksRight: (row) => {
      const { mutation, undo } = reviewPatch(row);
      applyWithUndo([mutation], toastReviewed, [undo]);
    },
    onRecategorise: (row, categoryId) => {
      const { mutation, undo } = reviewPatch(row, categoryId);
      applyWithUndo([mutation], toastReviewed, [undo]);
    },
  };

  const highConfidence = filters.review
    ? list.transactions.filter(
        (row) =>
          row.needsReview &&
          row.kind !== "transfer" &&
          (row.aiConfidence ?? 0) >= HIGH_CONFIDENCE,
      )
    : [];

  const closePane = () => {
    const previous = url.selectedId;
    url.close();
    setSeed(null);
    if (previous) focusRow(previous);
  };

  const openNew = () => {
    setSeed(null);
    setFocusRequest(undefined);
    url.openNew("expense");
  };

  const cursorIndex = () => {
    const id = cursorId ?? url.selectedId;
    if (id === null) return -1;
    return list.transactions.findIndex((row) => row.id === id);
  };

  const moveCursor = (step: 1 | -1) => {
    if (list.transactions.length === 0) return;
    const current = cursorIndex();
    const next = Math.min(
      list.transactions.length - 1,
      Math.max(0, current === -1 ? 0 : current + step),
    );
    const row = list.transactions[next];
    setCursorId(row.id);
    const itemIndex = list.indexById.get(row.id) ?? 0;
    virtuosoRef.current?.scrollIntoView({
      index: itemIndex,
      done: () => {
        focusRow(row.id);
      },
    });
    if (isWide && url.isOpen) url.open(row.id);
  };

  const target = () => {
    const id = cursorId ?? url.selectedId;
    return id === null
      ? undefined
      : list.transactions.find((row) => row.id === id);
  };

  const openWithFocus = (focus: EditorFocusTarget) => {
    const row = target();
    if (!row) return;
    setFocusRequest({ target: focus, nonce: Date.now() });
    if (url.selectedId !== row.id) url.open(row.id);
  };

  useListShortcuts({
    onNew: openNew,
    onSearch: () => {
      searchRef.current?.focus();
      searchRef.current?.select();
    },
    onMove: moveCursor,
    onOpen: () => {
      openWithFocus("amount");
    },
    onEdit: () => {
      openWithFocus("amount");
    },
    onCategory: () => {
      openWithFocus("category");
    },
    onDelete: () => {
      const row = target();
      if (!row) return;
      const index = list.transactions.indexOf(row);
      const next =
        list.transactions.at(index + 1) ?? list.transactions.at(index - 1);
      applyWithUndo(
        [
          row.status === "expected"
            ? { name: "skipExpected", args: { id: row.id } }
            : { name: "deleteTransaction", args: { id: row.id } },
        ],
        row.status === "expected" ? toastSkipped : toastDeleted,
        [{ name: "restoreTransaction", args: { id: row.id } }],
      );
      if (url.selectedId === row.id) url.close();
      if (next && next.id !== row.id) {
        setCursorId(next.id);
        focusRow(next.id);
      }
    },
    onClose: () => {
      if (url.isOpen) closePane();
    },
  });

  const setFilters = (next: TransactionFilters) => {
    url.setFilters(next);
  };

  const editorKey = `${url.selectedId ?? `new-${url.newKind ?? ""}-${url.refundOfId ?? ""}`}-${String(seed?.nonce ?? 0)}`;
  const editor =
    url.isOpen && bootstrapped ? (
      <TransactionEditor
        key={editorKey}
        transactionId={url.selectedId}
        initialKind={url.newKind ?? "expense"}
        refundOfId={url.refundOfId}
        seedDraft={url.selectedId === null ? seed?.draft : null}
        focusRequest={
          focusRequest ??
          (seed && url.selectedId === null
            ? {
                target: seed.draft.amountText === "" ? "amount" : "category",
                nonce: seed.nonce,
              }
            : undefined)
        }
        focusTargetRef={focusTargetRef}
        showClose={isWide}
        onClose={closePane}
        onSaved={(_, andNew) => {
          if (!andNew) closePane();
        }}
        onOpenTransaction={(id) => {
          setSeed(null);
          url.open(id);
        }}
        onRefund={(id) => {
          setSeed(null);
          url.openNew("expense", id);
        }}
      />
    ) : null;

  const listLabel = t({ en: "Transactions by day", zh: "按日分组的交易" });
  const master = (
    <div css={stack.group}>
      <header css={stack.item}>
        <div css={[flex.between, styles.titleRow]}>
          <div css={stack.tight}>
            <Heading level={1} look="h3">
              {t({ en: "Transactions", zh: "交易" })}
            </Heading>
            {bootstrapped ? (
              <Text look="bodySmall" tone="muted" css={typeModifier.numeric}>
                {`${new Intl.NumberFormat(locale).format(summary.count)} ${t({
                  en: "transactions",
                  zh: "笔交易",
                })} · ${formatMoney(Math.abs(summary.spent), baseCurrency, locale)} ${t(
                  { en: "spent", zh: "支出" },
                )}`}
              </Text>
            ) : null}
          </div>
          <div css={styles.wideOnly}>
            <Button
              look="primary"
              icon={<PlusIcon weight="bold" />}
              onClick={openNew}
              aria-keyshortcuts="n"
            >
              {t({ en: "Add", zh: "记一笔" })}
            </Button>
          </div>
        </div>
        {bootstrapped ? (
          <QuickAdd
            inputRef={quickAddRef}
            onNeedsEditor={(draft) => {
              setFocusRequest(undefined);
              setSeed({ draft, nonce: Date.now() });
              url.openNew(draft.kind);
            }}
          />
        ) : null}
        <search css={stack.tight}>
          <TextField
            ref={searchRef}
            type="search"
            label={t({ en: "Search transactions", zh: "搜索交易" })}
            labelHidden
            placeholder={
              isWide
                ? t({
                    en: "Search payee, note or category",
                    zh: "搜索商家、备注或分类",
                  })
                : t({ en: "Search", zh: "搜索" })
            }
            leading={<MagnifyingGlassIcon weight="bold" />}
            aria-keyshortcuts="/"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setUrlQuery(event.target.value.trim());
              url.setFilters({
                ...url.filters,
                query: event.target.value.trim(),
              });
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query !== "") {
                event.preventDefault();
                setQuery("");
                setUrlQuery("");
                url.setFilters({ ...url.filters, query: "" });
              }
            }}
          />
          <TransactionFilterBar
            filters={filters}
            onChange={setFilters}
            reviewCount={counts.review}
            expectedCount={counts.expected}
            members={members}
            accounts={accounts}
            accountGroups={accountGroups}
            categories={categories}
            lookups={lookups}
            today={today}
          />
        </search>
        {highConfidence.length > 0 ? (
          <div css={cluster.tight}>
            <Button
              size="sm"
              icon={<CheckIcon weight="bold" />}
              onClick={() => {
                applyWithUndo(
                  highConfidence.map((row) => reviewPatch(row).mutation),
                  `${toastAccepted} ${String(highConfidence.length)}`,
                  highConfidence.map((row) => reviewPatch(row).undo),
                );
              }}
            >
              {`${t({
                en: "Accept all with high confidence",
                zh: "接受全部高置信度交易",
              })} (${String(highConfidence.length)})`}
            </Button>
          </div>
        ) : null}
      </header>

      {!bootstrapped ? (
        <div css={stack.item} aria-busy="true">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} css={[flex.row, styles.skeletonRow]}>
              <Skeleton width="2.25rem" height="2.25rem" />
              <div css={[stack.tight, styles.grow]}>
                <Skeleton width="60%" height="1rem" />
                <Skeleton width="35%" height="0.75rem" />
              </div>
            </div>
          ))}
        </div>
      ) : list.items.length === 0 ? (
        <div css={[stack.item, corner.radius_3, styles.empty]}>
          <Text tone="muted">
            {rows.length === 0
              ? t({
                  en: "No transactions yet. Type one above, such as 12.50 Tesco.",
                  zh: "还没有交易。在上方输入一笔，例如 12.50 Tesco。",
                })
              : t({
                  en: "Nothing matches these filters.",
                  zh: "没有符合筛选条件的交易。",
                })}
          </Text>
        </div>
      ) : (
        <TransactionList
          virtuosoRef={virtuosoRef}
          items={list.items}
          lookups={lookups}
          entriesByTransaction={entriesByTransaction}
          tagIdsByTransaction={tagIdsByTransaction}
          pendingKeys={pendingKeys}
          baseCurrency={baseCurrency}
          locale={locale}
          today={today}
          onToggleUpcoming={() => {
            setUpcomingOpen(!upcomingOpen);
          }}
          selectedId={url.selectedId}
          reviewMode={filters.review}
          categoriesByKind={categoriesByKind}
          actions={rowActions}
          listLabel={listLabel}
        />
      )}
    </div>
  );

  const detailLabel = t({ en: "Transaction", zh: "交易" });
  return (
    <div css={styles.root}>
      <div css={styles.master}>{master}</div>
      {isWide ? (
        <aside aria-label={detailLabel} css={[corner.radius_4, styles.pane]}>
          {editor ?? <EmptyPane />}
        </aside>
      ) : (
        <PaneSheet
          isOpen={url.isOpen}
          onClose={closePane}
          label={detailLabel}
          initialFocusRef={focusTargetRef}
        >
          {editor}
        </PaneSheet>
      )}
    </div>
  );
}

function EmptyPane() {
  const keys: [string, string][] = [
    ["N", t({ en: "New transaction", zh: "新建交易" })],
    ["/", t({ en: "Search", zh: "搜索" })],
    ["J / K", t({ en: "Next and previous", zh: "下一笔、上一笔" })],
    ["Enter", t({ en: "Open", zh: "打开" })],
    ["E", t({ en: "Edit the amount", zh: "编辑金额" })],
    ["C", t({ en: "Change the category", zh: "更改分类" })],
    ["D", t({ en: "Delete, with undo", zh: "删除（可撤销）" })],
    ["Esc", t({ en: "Close", zh: "关闭" })],
  ];
  return (
    <div css={stack.item}>
      <Text tone="muted">
        {t({
          en: "Pick a transaction to see or change it.",
          zh: "选择一笔交易以查看或修改。",
        })}
      </Text>
      <dl css={[styles.keys, typeRole.bodySmall]}>
        {keys.map(([key, label]) => (
          <div key={key} css={styles.keyRow}>
            <dt>
              <kbd css={[typeRole.caption, corner.radius_1, styles.kbd]}>
                {key}
              </kbd>
            </dt>
            <dd css={styles.keyLabel}>{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const styles = stylex.create({
  root: {
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr)",
      [breakpoints.lg]: "minmax(0, 1fr) minmax(22rem, 26rem)",
    },
    gap: rhythm.group,
    alignItems: "start",
  },
  master: {
    minInlineSize: 0,
  },
  titleRow: {
    gap: rhythm.item,
    alignItems: "flex-end",
  },
  wideOnly: {
    display: { default: "none", [breakpoints.lg]: "block" },
  },
  pane: {
    position: "sticky",
    insetBlockStart: space._4,
    maxBlockSize: `calc(100dvh - ${space._8})`,
    overflowY: "auto",
    overscrollBehavior: "contain",
    paddingBlockStart: space._5,
    paddingBlockEnd: `calc(${space._7} + env(safe-area-inset-bottom))`,
    paddingInline: space._5,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurface,
  },
  skeletonRow: {
    gap: rhythm.item,
    paddingInline: space._2,
  },
  grow: {
    flexGrow: 1,
  },
  empty: {
    padding: space._5,
    backgroundColor: color.bgSurfaceSunken,
  },
  keys: {
    display: "grid",
    gap: rhythm.tight,
    margin: 0,
  },
  keyRow: {
    display: "grid",
    gridTemplateColumns: "4.5rem 1fr",
    alignItems: "center",
    gap: rhythm.tight,
  },
  keyLabel: {
    margin: 0,
    color: color.fgMuted,
  },
  kbd: {
    fontFamily: "inherit",
    paddingInline: space._1,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.border,
    backgroundColor: color.bgSurfaceSunken,
  },
});
