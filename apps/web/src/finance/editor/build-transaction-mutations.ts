import type { FxIndex } from "../domain/balance/create-fx-index.ts";
import { toEpochDay } from "../domain/dates/to-epoch-day.ts";
import { parseMoney } from "../domain/money/parse-money.ts";
import { fromMinorUnits } from "../domain/money/to-minor-units.ts";
import type { LocalMutationInput } from "../replica/create-replica-store.ts";
import type { EntryInput, TransactionPatch } from "../sync/mutation-schema.ts";
import type {
  AccountRow,
  EntryRow,
  PayeeRow,
  TransactionRow,
} from "../sync/row-schemas.ts";
import type { TransactionKind } from "../transactions/transaction-filters.ts";
import type { EditorDraft, EditorError, EditorField } from "./editor-draft.ts";
import { normalisePayeeText } from "./rank-payees.ts";
import { splitEntries } from "./split-entries.ts";
import { unconfirmMutations } from "./unconfirm-mutations.ts";

type SaveTarget =
  | { type: "create"; id: string }
  | {
      type: "update";
      existing: TransactionRow;
      entries: readonly EntryRow[];
      tagIds: readonly string[];
    };

export interface BuildMutationsContext {
  target: SaveTarget;
  accountById: ReadonlyMap<string, Pick<AccountRow, "currency">>;
  /** Live Payees, to reuse one whose name the person typed again. */
  payees: readonly Pick<PayeeRow, "id" | "name">[];
  baseCurrency: string;
  fx: FxIndex;
  createId: () => string;
}

type BuildMutationsResult =
  | {
      ok: true;
      transactionId: string;
      /** In order: a new Payee first, then the Transaction. */
      mutations: LocalMutationInput[];
      /** What puts the Transaction back as it was. */
      undo: LocalMutationInput[];
    }
  | { ok: false; errors: Partial<Record<EditorField, EditorError>> };

interface EntryDraft {
  accountId: string;
  amountMinor: number;
  fxRate: number | null;
}

function round(value: number) {
  return Math.round(value);
}

function sameSet(a: readonly string[], b: readonly string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

function readAmount(text: string, currency: string) {
  if (text.trim() === "") return { error: "amountMissing" as const };
  const minor = parseMoney(text, currency);
  if (minor === null || minor === 0) {
    return { error: "amountUnreadable" as const };
  }
  return { minor: Math.abs(minor) };
}

/** The Transaction's fields and Entries the draft describes, or the errors that stop a save. */
function readDraft(draft: EditorDraft, context: BuildMutationsContext) {
  const errors: Partial<Record<EditorField, EditorError>> = {};
  const account =
    draft.accountId === null
      ? undefined
      : context.accountById.get(draft.accountId);
  if (!account) errors.account = "accountMissing";
  const currency = account?.currency ?? context.baseCurrency;
  const amount = readAmount(draft.amountText, currency);
  if ("error" in amount) errors.amount = amount.error;

  if (draft.kind === "transfer") {
    const toAccount =
      draft.toAccountId === null
        ? undefined
        : context.accountById.get(draft.toAccountId);
    if (!toAccount) errors.toAccount = "toAccountMissing";
    else if (draft.toAccountId === draft.accountId) {
      errors.toAccount = "sameAccount";
    }
    let toMinor: number | null = null;
    if (toAccount && toAccount.currency !== currency) {
      const toAmount = readAmount(draft.toAmountText, toAccount.currency);
      if ("error" in toAmount) errors.toAmount = toAmount.error;
      else toMinor = toAmount.minor;
    }
    if (Object.keys(errors).length > 0 || "error" in amount || !toAccount) {
      return { ok: false as const, errors };
    }
    const sent = amount.minor;
    const received = toMinor ?? sent;
    const rate =
      toMinor === null
        ? null
        : fromMinorUnits(received, toAccount.currency) /
          fromMinorUnits(sent, currency);
    const entries: EntryDraft[] = [
      { accountId: draft.accountId ?? "", amountMinor: -sent, fxRate: null },
      {
        accountId: draft.toAccountId ?? "",
        amountMinor: received,
        fxRate: rate,
      },
    ];
    return {
      ok: true as const,
      fields: { amountMinor: 0, categoryId: null, refundOfId: null },
      entries,
    };
  }

  if (draft.categoryId === null) errors.category = "categoryMissing";
  const direction = draft.kind === "income" || draft.refund ? 1 : -1;

  let paysDown: { accountId: string; currency: string; minor: number } | null =
    null;
  if (draft.paysDownAccountId !== null) {
    const paysDownAccount = context.accountById.get(draft.paysDownAccountId);
    if (!paysDownAccount) errors.paysDown = "accountMissing";
    else if (draft.paysDownAccountId === draft.accountId) {
      errors.paysDown = "sameAccount";
    }
    const paysDownCurrency = paysDownAccount?.currency ?? context.baseCurrency;
    const paysDownAmount = readAmount(
      draft.paysDownAmountText,
      paysDownCurrency,
    );
    if ("error" in paysDownAmount) {
      errors.paysDownAmount = paysDownAmount.error;
    } else {
      paysDown = {
        accountId: draft.paysDownAccountId,
        currency: paysDownCurrency,
        minor: -direction * paysDownAmount.minor,
      };
    }
  }
  if (Object.keys(errors).length > 0 || "error" in amount) {
    return { ok: false as const, errors };
  }
  const signed = direction * amount.minor;

  const day = toEpochDay(draft.date);
  const rateOf = (entryCurrency: string) =>
    entryCurrency === context.baseCurrency
      ? null
      : context.fx.rateToBase(entryCurrency, day);
  const entries: EntryDraft[] = [
    {
      accountId: draft.accountId ?? "",
      amountMinor: signed,
      fxRate: rateOf(currency),
    },
  ];
  if (paysDown) {
    entries.push({
      accountId: paysDown.accountId,
      amountMinor: paysDown.minor,
      fxRate: rateOf(paysDown.currency),
    });
  }
  return {
    ok: true as const,
    fields: {
      amountMinor:
        currency === context.baseCurrency
          ? signed
          : round(context.fx.toBase(signed, currency, day)),
      categoryId: draft.categoryId,
      refundOfId:
        draft.kind === "expense" && draft.refund ? draft.refundOfId : null,
    },
    entries,
  };
}

const SCALAR_FIELDS = [
  "kind",
  "date",
  "amountMinor",
  "categoryId",
  "payeeId",
  "memberId",
  "refundOfId",
  "note",
  "needsReview",
] as const;

function sameEntry(a: EntryDraft, b: EntryDraft) {
  return a.accountId === b.accountId && a.amountMinor === b.amountMinor;
}

/**
 * The Entries the Transaction has after the save. An Entry keeps its id, and
 * its rate when its account and amount stay the same. For an expense or
 * income, Entries the editor does not show stay as they are, so a save never
 * drops the loan Entry of a mortgage payment.
 */
function mergeEntries(
  kind: TransactionKind,
  entries: readonly EntryRow[],
  nextEntries: readonly EntryDraft[],
  sameDay: boolean,
  createId: () => string,
): EntryInput[] {
  const keep = (existing: EntryRow | undefined, next: EntryDraft) => ({
    id: existing?.id ?? createId(),
    accountId: next.accountId,
    amountMinor: next.amountMinor,
    fxRate:
      existing && sameDay && sameEntry(existing, next)
        ? existing.fxRate
        : next.fxRate,
  });
  if (kind === "transfer") {
    return nextEntries.map((next, index) => keep(entries.at(index), next));
  }
  const { main, paysDown, others } = splitEntries(entries);
  const [nextMain] = nextEntries;
  const nextPaysDown = nextEntries.at(1);
  return [
    keep(main, nextMain),
    ...(nextPaysDown ? [keep(paysDown, nextPaysDown)] : []),
    ...others.map((entry) => ({
      id: entry.id,
      accountId: entry.accountId,
      amountMinor: entry.amountMinor,
      fxRate: entry.fxRate,
    })),
  ];
}

function patchOf(
  existing: TransactionRow,
  entries: readonly EntryRow[],
  tagIds: readonly string[],
  next: Required<Omit<TransactionPatch, "entries" | "tagIds" | "needsReview">>,
  nextEntries: readonly EntryInput[],
  nextTagIds: readonly string[],
): TransactionPatch {
  const patch: TransactionPatch = {};
  for (const key of SCALAR_FIELDS) {
    if (key === "needsReview") continue;
    if (existing[key] !== next[key]) Object.assign(patch, { [key]: next[key] });
  }
  const entriesChanged =
    entries.length !== nextEntries.length ||
    nextEntries.some(
      (entry, index) =>
        entries[index].id !== entry.id ||
        entries[index].accountId !== entry.accountId ||
        entries[index].amountMinor !== entry.amountMinor ||
        entries[index].fxRate !== entry.fxRate,
    );
  if (entriesChanged) patch.entries = [...nextEntries];
  if (!sameSet(tagIds, nextTagIds)) patch.tagIds = [...nextTagIds];
  if (existing.needsReview) patch.needsReview = false;
  return patch;
}

/** The patch that turns the Transaction back into `existing`, for Undo. */
function reverseOf(
  existing: TransactionRow,
  entries: readonly EntryRow[],
  tagIds: readonly string[],
  patch: TransactionPatch,
): TransactionPatch {
  const reverse: TransactionPatch = {};
  for (const key of SCALAR_FIELDS) {
    if (patch[key] !== undefined)
      Object.assign(reverse, { [key]: existing[key] });
  }
  if (patch.entries) {
    reverse.entries = entries.map((entry) => ({
      id: entry.id,
      accountId: entry.accountId,
      amountMinor: entry.amountMinor,
      fxRate: entry.fxRate,
    }));
  }
  if (patch.tagIds) reverse.tagIds = [...tagIds];
  return reverse;
}

/**
 * The mutations that save the editor's draft: an `upsertPayee` when the
 * Payee name is new, then a `createTransaction`, or an `updateTransaction`
 * with only the changed fields (a `confirmExpected` for an Expected one).
 * The sign of the amount follows the kind: an expense is negative, a refund
 * and an income positive, and a transfer moves the amount out of one account
 * and into the other. A pays-down Entry moves against the main one. An edit
 * keeps the Entries the editor does not show, and keeps the stats amount
 * while the main Entry and the date stay the same.
 */
export function buildTransactionMutations(
  draft: EditorDraft,
  context: BuildMutationsContext,
): BuildMutationsResult {
  const read = readDraft(draft, context);
  if (!read.ok) return { ok: false, errors: read.errors };

  const mutations: LocalMutationInput[] = [];
  const undo: LocalMutationInput[] = [];
  let payeeId: string | null = null;
  const payeeName = draft.payeeName.trim();
  if (payeeName !== "") {
    const wanted = normalisePayeeText(payeeName);
    const chosen = context.payees.find((payee) => payee.id === draft.payeeId);
    const existing =
      chosen && normalisePayeeText(chosen.name) === wanted
        ? chosen
        : context.payees.find(
            (payee) => normalisePayeeText(payee.name) === wanted,
          );
    if (existing) {
      payeeId = existing.id;
    } else {
      payeeId = context.createId();
      mutations.push({
        name: "upsertPayee",
        args: { id: payeeId, name: payeeName.slice(0, 200) },
      });
    }
  }

  const next = {
    kind: draft.kind,
    date: draft.date,
    ...read.fields,
    payeeId,
    memberId: draft.memberId,
    note: draft.note.trim(),
  };
  const tagIds = [...new Set(draft.tagIds)];
  const { target } = context;

  if (target.type === "create") {
    mutations.push({
      name: "createTransaction",
      args: {
        id: target.id,
        ...next,
        needsReview: false,
        entries: read.entries.map((entry) => ({
          id: context.createId(),
          ...entry,
        })),
        tagIds,
      },
    });
    undo.push({ name: "deleteTransaction", args: { id: target.id } });
    return { ok: true, transactionId: target.id, mutations, undo };
  }

  const { existing } = target;
  const mainBefore = splitEntries(target.entries).main;
  const mainAfter = read.entries[0];
  if (
    draft.kind !== "transfer" &&
    existing.kind === draft.kind &&
    existing.date === draft.date &&
    mainBefore !== undefined &&
    sameEntry(mainBefore, mainAfter)
  ) {
    next.amountMinor = existing.amountMinor;
  }
  const patch = patchOf(
    existing,
    target.entries,
    target.tagIds,
    next,
    mergeEntries(
      draft.kind,
      target.entries,
      read.entries,
      existing.date === draft.date,
      context.createId,
    ),
    tagIds,
  );
  const { id } = existing;
  if (existing.status === "expected") {
    mutations.push({ name: "confirmExpected", args: { id, patch } });
    undo.push(
      ...unconfirmMutations({
        transaction: existing,
        entries: target.entries,
        tagIds: target.tagIds,
        createId: context.createId,
      }),
    );
  } else if (Object.keys(patch).length > 0) {
    mutations.push({ name: "updateTransaction", args: { id, patch } });
    undo.push({
      name: "updateTransaction",
      args: {
        id,
        patch: reverseOf(existing, target.entries, target.tagIds, patch),
      },
    });
  }
  return { ok: true, transactionId: id, mutations, undo };
}
