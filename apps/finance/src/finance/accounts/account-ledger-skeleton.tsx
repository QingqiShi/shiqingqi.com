import * as stylex from "@stylexjs/stylex";
import { Divider } from "@tuja/ui/components/divider";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { dayHeader } from "../transactions/day-header.stylex.ts";
import { TransactionRowSkeleton } from "../transactions/transaction-row-skeleton.tsx";

/** How many entries each day of the skeleton holds. */
const DAY_ENTRIES = [1, 2, 1, 2];
const ENTRY_LINES = [
  { width: "7rem", height: "1.25rem" },
  { width: "5rem", height: "1rem" },
];
const ENTRY_TRAILING = [
  { width: "4.5rem", height: "1.25rem" },
  { width: "4rem", height: ".875rem" },
];

/** `AccountLedger` before it shows: a few days of entries, as blocks of the same size. */
export function AccountLedgerSkeleton() {
  return (
    <div aria-busy>
      {DAY_ENTRIES.map((entries, day) => (
        <div key={day}>
          <div css={[plainList.row, dayHeader.day]}>
            <div css={[typeRole.label, styles.label]}>
              <Skeleton width="8rem" height="1rem" />
            </div>
            <Divider />
          </div>
          <div css={[listSurface.plain, styles.entries]}>
            {Array.from({ length: entries }, (_, entry) => (
              <TransactionRowSkeleton
                key={entry}
                lines={ENTRY_LINES}
                trailing={ENTRY_TRAILING}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const styles = stylex.create({
  label: {
    display: "flex",
    alignItems: "center",
    blockSize: "1lh",
  },
  entries: {
    paddingBlockStart: space._0,
  },
});
