import * as stylex from "@stylexjs/stylex";
import { Avatar } from "@tuja/ui/components/avatar";
import { Text } from "@tuja/ui/components/text";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { SignOutButton } from "./sign-out-button.tsx";
import { SyncStatusIndicator } from "./sync-status-indicator.tsx";

interface SignedInMemberProps {
  memberName: string;
  householdName: string;
}

/**
 * Who is signed in, to which Household, the sync status, and sign out. The
 * rail shows it from 34rem, and the Settings menu below 34rem.
 */
export function SignedInMember({
  memberName,
  householdName,
}: SignedInMemberProps) {
  return (
    <div css={[stack.tight, styles.root]}>
      <SyncStatusIndicator />
      <div css={[row.tight, styles.member]}>
        <Avatar name={memberName} size="sm" />
        <div css={styles.names}>
          <Text as="span" look="label" lines={1}>
            {memberName}
          </Text>
          <Text as="span" look="caption" tone="muted" lines={1}>
            {householdName}
          </Text>
        </div>
        <SignOutButton />
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
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
});
