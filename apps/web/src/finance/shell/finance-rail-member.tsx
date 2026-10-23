"use client";

import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Popover } from "@tuja/ui/components/popover";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { t } from "#src/i18n.ts";
import { SignedInMember } from "./signed-in-member.tsx";
import { SyncStatusIndicator } from "./sync-status-indicator.tsx";

interface FinanceRailMemberProps {
  memberName: string;
  householdName: string;
}

/**
 * The bottom of the rail: the sync status as an icon, and the signed-in
 * Member as an avatar that opens who is signed in, to which Household, the
 * full sync status, and sign out.
 */
export function FinanceRailMember({
  memberName,
  householdName,
}: FinanceRailMemberProps) {
  const label = `${t({ en: "Signed in as", zh: "当前登录：" })} ${memberName}`;
  return (
    <div css={[stack.item, styles.root]}>
      <SyncStatusIndicator compact />
      <Popover
        placement="right-end"
        aria-label={label}
        css={styles.popover}
        trigger={(props) => (
          <button
            {...props}
            aria-label={label}
            css={[buttonReset.base, corner.radius_round]}
          >
            <Avatar name={memberName} aria-hidden />
          </button>
        )}
      >
        <SignedInMember
          memberName={memberName}
          householdName={householdName}
          css={styles.member}
        />
      </Popover>
    </div>
  );
}

const styles = stylex.create({
  root: {
    alignItems: "center",
  },
  popover: {
    inlineSize: "16rem",
  },
  member: {
    paddingBlockStart: 0,
    borderBlockStartWidth: 0,
  },
});
