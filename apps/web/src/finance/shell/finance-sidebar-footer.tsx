import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { SignOutButton } from "./sign-out-button.tsx";
import { SyncStatusIndicator } from "./sync-status-indicator.tsx";

interface FinanceSidebarFooterProps {
  memberName: string;
  householdName: string;
}

/** Who is signed in, to which Household, the sync status, and sign out. */
export function FinanceSidebarFooter({
  memberName,
  householdName,
}: FinanceSidebarFooterProps) {
  return (
    <div css={[stack.tight, styles.footer]}>
      <SyncStatusIndicator />
      <div css={[row.tight, styles.member]}>
        <Avatar name={memberName} size="sm" />
        <div css={styles.names}>
          <span css={[typeRole.label, styles.name]}>{memberName}</span>
          <span css={[typeRole.caption, styles.household]}>
            {householdName}
          </span>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

const styles = stylex.create({
  footer: {
    paddingBlockStart: space._3,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.border,
    minInlineSize: 0,
  },
  member: {
    minInlineSize: 0,
  },
  names: {
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
    minInlineSize: 0,
  },
  name: {
    color: color.fg,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  household: {
    color: color.fgMuted,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});
