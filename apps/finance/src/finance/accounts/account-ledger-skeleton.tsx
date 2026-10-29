import * as stylex from "@stylexjs/stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { plainList } from "@tuja/ui/primitives/layout.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { dayHeader } from "../transactions/day-header.stylex.ts";
import { TransactionFaceSkeleton } from "../transactions/transaction-face-skeleton.tsx";
import { transactionFaceTokens } from "../transactions/transaction-face.stylex.ts";

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
            <div css={dayHeader.rule}>
              <div css={[typeRole.label, styles.label]}>
                <Skeleton width="8rem" height="1rem" />
              </div>
            </div>
          </div>
          <div css={styles.entries}>
            {Array.from({ length: entries }, (_, entry) => (
              <TransactionFaceSkeleton
                key={entry}
                lines={ENTRY_LINES}
                trailing={ENTRY_TRAILING}
                css={styles.entry}
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
  entry: {
    boxSizing: "border-box",
    blockSize: transactionFaceTokens.twoLines,
  },
});
