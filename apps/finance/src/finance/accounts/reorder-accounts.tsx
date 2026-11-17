"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { ReorderList, useReorderItem } from "@tuja/ui/components/reorder-list";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { useReplica } from "../replica/use-replica.ts";
import { moveTo, reorderMutations } from "../settings/reorder.ts";
import { useApplyMutations } from "../settings/use-apply-mutations.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { accountDetailLine } from "./account-detail-line.ts";
import type { AccountLine, BalanceSheet } from "./build-balance-sheet.ts";
import { institutionIconUrl } from "./institution-icon-url.ts";

function AccountFace({
  line,
  handle,
}: {
  line: AccountLine;
  handle: ReactNode;
}) {
  const accountName = useAccountDisplayName();
  const { account } = line;
  const detail = accountDetailLine(account, line.ownerName);
  return (
    <>
      <Avatar
        name={account.institution.trim() || account.name}
        src={institutionIconUrl(account)}
        shape="square"
        size="sm"
        aria-hidden
        css={styles.avatar}
      />
      <span css={styles.main}>
        <Text as="span" weight="medium" verbatim css={truncate.base}>
          {accountName(account)}
        </Text>
        {detail ? (
          <Text as="span" look="caption" tone="muted" css={truncate.base}>
            {detail}
          </Text>
        ) : null}
      </span>
      {handle}
    </>
  );
}

interface Section {
  groupId: string;
  name: string;
  lines: AccountLine[];
}

function AccountRow({ line }: { line: AccountLine }) {
  const accountName = useAccountDisplayName();
  const { ref, css, handle } = useReorderItem(
    line.account.id,
    accountName(line.account),
  );
  return (
    <li ref={ref} css={[corner.radius_2, styles.account, css]}>
      <AccountFace line={line} handle={handle} />
    </li>
  );
}

function GroupAccounts({ section }: { section: Section }) {
  const accounts = useReplica(liveRowSelectors.accounts);
  const apply = useApplyMutations();
  const labels = useReorderLabels();
  const empty = t({ en: "No accounts in this group.", zh: "此分组没有账户。" });
  if (section.lines.length === 0) {
    return (
      <Text look="bodySmall" tone="muted" measure="none" css={styles.empty}>
        {empty}
      </Text>
    );
  }
  const ids = section.lines.map((line) => line.account.id);
  return (
    <ReorderList
      {...labels}
      ids={ids}
      dragRow
      onMove={(from, to) => {
        apply(
          reorderMutations(
            "upsertAccount",
            accounts.filter((account) => account.groupId === section.groupId),
            moveTo(ids, ids[from], ids[to]),
          ),
        );
      }}
    >
      <ul css={styles.list}>
        {section.lines.map((line) => (
          <AccountRow key={line.account.id} line={line} />
        ))}
      </ul>
    </ReorderList>
  );
}

function GroupRow({ section }: { section: Section }) {
  const { ref, css, handle } = useReorderItem(section.groupId, section.name);
  return (
    <li ref={ref} css={[cardSurface.base, styles.group, css]}>
      <div css={styles.groupHeader}>
        <Text as="span" look="label" weight="semibold" verbatim>
          {section.name}
        </Text>
        {handle}
      </div>
      <GroupAccounts section={section} />
    </li>
  );
}

function useReorderLabels() {
  const move = t({ en: "Move {name}", zh: "移动 {name}" });
  const moved = t({
    en: "{name}: place {place} of {count}",
    zh: "{name}：第 {place} 项，共 {count} 项",
  });
  return {
    handleLabel: (name: string) => move.replace("{name}", name),
    movedLabel: (name: string, place: number, count: number) =>
      moved
        .replace("{place}", String(place))
        .replace("{count}", String(count))
        .replace("{name}", name),
  };
}

/**
 * The Net worth list as a list to reorder: a Group moves with its accounts,
 * past Groups of either side, and an account moves inside its Group. Each
 * move saves at once. Hidden accounts are left out and keep their places.
 */
export function ReorderAccounts({ sheet }: { sheet: BalanceSheet }) {
  const groups = useReplica(liveRowSelectors.accountGroups);
  const apply = useApplyMutations();
  const labels = useReorderLabels();
  const sections: Section[] = sheet.sections.map((section) => ({
    groupId: section.group.id,
    name: section.group.name,
    lines: section.lines.filter((line) => line.hidden === null),
  }));
  const ids = sections.map((section) => section.groupId);

  return (
    <ReorderList
      {...labels}
      ids={ids}
      dragRow
      onMove={(from, to) => {
        apply(
          reorderMutations(
            "upsertGroup",
            groups,
            moveTo(ids, ids[from], ids[to]),
          ),
        );
      }}
    >
      <ul css={[styles.list, stack.item]}>
        {sections.map((section) => (
          <GroupRow key={section.groupId} section={section} />
        ))}
      </ul>
    </ReorderList>
  );
}

const styles = stylex.create({
  list: {
    margin: 0,
    padding: 0,
    listStyle: "none",
  },
  group: {
    display: "flex",
    flexDirection: "column",
    gap: rhythm.tight,
    padding: space._2,
    cursor: "grab",
    userSelect: "none",
  },
  groupHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: rhythm.item,
    paddingInlineStart: space._2,
  },
  empty: {
    paddingInline: space._2,
  },
  account: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.item,
    paddingBlock: space._1,
    paddingInlineStart: space._2,
    backgroundColor: color.card,
    cursor: "grab",
    userSelect: "none",
  },
  avatar: {
    pointerEvents: "none",
  },
  main: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minInlineSize: 0,
  },
});
