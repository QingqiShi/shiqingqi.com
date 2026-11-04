"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { List } from "@tuja/ui/components/list";
import { listSurface } from "@tuja/ui/components/list.stylex";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { ReportBodySkeleton } from "./report-body-skeleton.tsx";
import { ReportsColumns } from "./reports-frame.tsx";

const WEEKS = 5;

function ReportListSkeleton() {
  return (
    <div css={stack.item} aria-busy>
      <Heading level={1} look="h3">
        {t({ en: "Reports", zh: "周报" })}
      </Heading>
      <div css={[stack.tight, styles.year]}>
        <Text as="div" look="overline">
          <Skeleton width="2.5rem" height="1em" />
        </Text>
        <List>
          {Array.from({ length: WEEKS }, (_, index) => (
            <li key={index} css={listSurface.item}>
              <span css={listSurface.row}>
                <Skeleton width="8rem" height="1em" delay={index * 100} />
              </span>
            </li>
          ))}
        </List>
      </div>
    </div>
  );
}

/** `/reports` before it can show, in its real columns: the list of weeks and the newest Report, as blocks. */
export function ReportsSkeleton() {
  return (
    <ReportsColumns
      openId={null}
      openLabel={null}
      list={<ReportListSkeleton />}
    >
      <ReportBodySkeleton />
    </ReportsColumns>
  );
}

const styles = stylex.create({
  year: {
    paddingBlockStart: rhythm.tight,
  },
});
