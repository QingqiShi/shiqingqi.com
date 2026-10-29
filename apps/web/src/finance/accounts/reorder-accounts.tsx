"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Avatar } from "@tuja/ui/components/avatar";
import { cardSurface } from "@tuja/ui/components/card.stylex";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { truncate } from "@tuja/ui/primitives/layout.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { color, font, rhythm, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { useReplica } from "../replica/use-replica.ts";
import { moveTo, reorderMutations } from "../settings/reorder.ts";
import { useApplyMutations } from "../settings/use-apply-mutations.ts";
import { liveRowSelectors } from "../store/live-row-selectors.ts";
import { useAccountDisplayName } from "../store/use-account-display-name.ts";
import { accountDetailLine } from "./account-detail-line.ts";
import type { AccountLine, BalanceSheet } from "./build-balance-sheet.ts";
import { institutionIconUrl } from "./institution-icon-url.ts";
import { DragHandle, SortableList } from "./sortable-list.tsx";

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
        <span css={[typeRole.body, truncate.base, styles.name]}>
          {accountName(account)}
        </span>
        {detail ? (
          <span css={[typeRole.caption, truncate.base, styles.detail]}>
            {detail}
          </span>
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

/**
 * The Net worth list as a list to reorder: a Group moves with its accounts,
 * past Groups of either side, and an account moves inside its Group. Each
 * drop saves at once. Hidden accounts are left out and keep their places.
 */
export function ReorderAccounts({ sheet }: { sheet: BalanceSheet }) {
  const groups = useReplica(liveRowSelectors.accountGroups);
  const accounts = useReplica(liveRowSelectors.accounts);
  const accountName = useAccountDisplayName();
  const apply = useApplyMutations();
  const empty = t({ en: "No accounts in this group.", zh: "此分组没有账户。" });
  const sections: Section[] = sheet.sections.map((section) => ({
    groupId: section.group.id,
    name: section.group.name,
    lines: section.lines.filter((line) => line.hidden === null),
  }));

  function accountsOf(section: Section, isLifted: boolean) {
    if (section.lines.length === 0) {
      return <p css={[typeRole.bodySmall, styles.empty]}>{empty}</p>;
    }
    if (isLifted) {
      return (
        <ul css={styles.list}>
          {section.lines.map((line) => (
            <li key={line.account.id} css={[corner.radius_2, styles.account]}>
              <AccountFace
                line={line}
                handle={<DragHandle name={accountName(line.account)} />}
              />
            </li>
          ))}
        </ul>
      );
    }
    return (
      <SortableList
        items={section.lines}
        idOf={(line) => line.account.id}
        nameOf={(line) => accountName(line.account)}
        onMove={(id, targetId) => {
          apply(
            reorderMutations(
              "upsertAccount",
              accounts.filter((account) => account.groupId === section.groupId),
              moveTo(
                section.lines.map((line) => line.account.id),
                id,
                targetId,
              ),
            ),
          );
        }}
        itemCss={[corner.radius_2, styles.account]}
        renderItem={(line, handle) => (
          <AccountFace line={line} handle={handle} />
        )}
      />
    );
  }

  return (
    <SortableList
      items={sections}
      idOf={(section) => section.groupId}
      nameOf={(section) => section.name}
      onMove={(id, targetId) => {
        apply(
          reorderMutations(
            "upsertGroup",
            groups,
            moveTo(
              sections.map((section) => section.groupId),
              id,
              targetId,
            ),
          ),
        );
      }}
      css={stack.item}
      itemCss={[cardSurface.base, styles.group]}
      renderItem={(section, handle, isLifted) => (
        <>
          <div css={styles.groupHeader}>
            <span css={[typeRole.label, styles.groupName]}>{section.name}</span>
            {handle}
          </div>
          {accountsOf(section, isLifted)}
        </>
      )}
    />
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
  groupName: {
    fontWeight: font.weight_6,
    color: color.fg,
  },
  empty: {
    margin: 0,
    paddingInline: space._2,
    color: color.fgMuted,
  },
  account: {
    display: "flex",
    alignItems: "center",
    gap: rhythm.item,
    paddingBlock: space._1,
    paddingInlineStart: space._2,
    backgroundColor: color.bgSurface,
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
  name: {
    fontWeight: font.weight_5,
  },
  detail: {
    color: color.fgMuted,
  },
});
