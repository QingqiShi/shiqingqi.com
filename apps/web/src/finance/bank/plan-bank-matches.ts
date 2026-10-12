import { toEpochDay } from "../domain/dates/to-epoch-day.ts";

/** How many days a bank date may differ from ours and still match. */
export const MATCH_DAY_WINDOW = 3;

export interface MatchCandidate {
  transactionId: string;
  entryId: string;
  status: "posted" | "expected";
  date: string;
  /** The Entry amount on the linked account, or on In transit. */
  amountMinor: number;
  /** The Entry is on In transit, so a match moves it to the linked account. */
  inTransit: boolean;
  createdAt: Date;
}

export type BankMatch =
  | { action: "confirm"; transactionId: string }
  | { action: "link"; transactionId: string }
  | { action: "settle"; transactionId: string; entryId: string }
  | { action: "create" };

interface Score {
  matches: number;
  settles: number;
  expected: number;
  gap: number;
  /** The sum of each matched candidate's place in createdAt, then id, order. */
  age: number;
}

const NONE: Score = { matches: 0, settles: 0, expected: 0, gap: 0, age: 0 };

function compareScores(a: Score, b: Score) {
  return (
    a.matches - b.matches ||
    b.settles - a.settles ||
    a.expected - b.expected ||
    b.gap - a.gap ||
    b.age - a.age
  );
}

function actionFor(candidate: MatchCandidate): BankMatch {
  const { transactionId } = candidate;
  if (candidate.inTransit) {
    return { action: "settle", transactionId, entryId: candidate.entryId };
  }
  return candidate.status === "expected"
    ? { action: "confirm", transactionId }
    : { action: "link", transactionId };
}

const MATCH = 1;
const SKIP_CANDIDATE = 2;
const SKIP_ROW = 3;

/**
 * Pairs the bank rows and candidates of one signed amount. Both lists are in
 * date order, and some best pairing never crosses, so a DP over the two
 * lists finds it. On a tie it matches the earlier row. Each row keeps only
 * the cells of the candidates in its day window, so the DP grows with the
 * rows, not with rows times candidates.
 */
function planAmount(
  rows: readonly { index: number; day: number }[],
  candidates: readonly (MatchCandidate & { day: number; age: number })[],
  plan: BankMatch[],
) {
  const from: number[] = [];
  const to: number[] = [];
  const offset: number[] = [];
  let first = 0;
  let last = 0;
  let cells = 0;
  for (const row of rows) {
    while (
      first < candidates.length &&
      candidates[first].day < row.day - MATCH_DAY_WINDOW
    ) {
      first++;
    }
    last = Math.max(last, first);
    while (
      last < candidates.length &&
      candidates[last].day <= row.day + MATCH_DAY_WINDOW
    ) {
      last++;
    }
    from.push(first);
    to.push(last);
    offset.push(cells);
    cells += last - first + 1;
  }
  const best = new Array<Score>(cells);
  const choice = new Uint8Array(cells);
  const cell = (i: number, j: number) => offset[i] + Math.max(j - from[i], 0);
  const scoreAt = (i: number, j: number) =>
    i === rows.length ? NONE : best[cell(i, j)];

  for (let i = rows.length - 1; i >= 0; i--) {
    best[cell(i, to[i])] = scoreAt(i + 1, to[i]);
    choice[cell(i, to[i])] = SKIP_ROW;
    for (let j = to[i] - 1; j >= from[i]; j--) {
      let score = best[cell(i, j + 1)];
      let chosen = SKIP_CANDIDATE;
      const after = scoreAt(i + 1, j + 1);
      const matched = {
        matches: after.matches + 1,
        settles: after.settles + Number(candidates[j].inTransit),
        expected: after.expected + Number(candidates[j].status === "expected"),
        gap: after.gap + Math.abs(rows[i].day - candidates[j].day),
        age: after.age + candidates[j].age,
      };
      if (compareScores(matched, score) >= 0) {
        score = matched;
        chosen = MATCH;
      }
      const skipRow = scoreAt(i + 1, j);
      if (compareScores(skipRow, score) > 0) {
        score = skipRow;
        chosen = SKIP_ROW;
      }
      best[cell(i, j)] = score;
      choice[cell(i, j)] = chosen;
    }
  }

  let i = 0;
  let j = 0;
  while (i < rows.length && j < candidates.length) {
    const chosen = choice[cell(i, j)];
    j = Math.max(j, from[i]);
    if (chosen === MATCH) {
      const candidate = candidates[j];
      plan[rows[i].index] = actionFor(candidate);
    }
    if (chosen !== SKIP_CANDIDATE) i++;
    if (chosen !== SKIP_ROW) j++;
  }
}

/**
 * What to do with each new bank row, in the order of `rows`. Each
 * `amountMinor` already has the link's sign multiplier applied. A row can
 * match a candidate with the same signed amount and a date at most three days
 * away, and each candidate matches at most one row. The plan matches as many
 * rows as it can; then settles as few In transit Entries as it can, so a
 * Transaction already on the account wins; then confirms as many Expected
 * Transactions as it can;
 * then keeps the sum of the day gaps smallest; then uses the earliest
 * created candidates. A row without a match gets a new Transaction.
 */
export function planBankMatches(
  rows: readonly { date: string; amountMinor: number }[],
  candidates: readonly MatchCandidate[],
): BankMatch[] {
  const plan: BankMatch[] = rows.map(() => ({ action: "create" }));
  const rowsByAmount = Map.groupBy(
    rows
      .map((row, index) => ({ ...row, index, day: toEpochDay(row.date) }))
      .sort((a, b) => a.day - b.day || a.index - b.index),
    (row) => row.amountMinor,
  );
  const candidatesByAmount = Map.groupBy(
    [...candidates]
      .sort(
        (a, b) =>
          a.createdAt.getTime() - b.createdAt.getTime() ||
          a.transactionId.localeCompare(b.transactionId) ||
          a.entryId.localeCompare(b.entryId),
      )
      .map((candidate, age) => ({
        ...candidate,
        age,
        day: toEpochDay(candidate.date),
      }))
      .sort((a, b) => a.day - b.day || a.age - b.age),
    (candidate) => candidate.amountMinor,
  );
  for (const [amountMinor, amountRows] of rowsByAmount) {
    const amountCandidates = candidatesByAmount.get(amountMinor);
    if (amountCandidates) planAmount(amountRows, amountCandidates, plan);
  }
  return plan;
}
