"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Card } from "@tuja/ui/components/card";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { SignedInMember } from "../shell/signed-in-member.tsx";

/** The signed-in Member on a surface of its own under the Settings menu below `md`, where the rail that shows it is hidden. */
export function SettingsSignedInMember() {
  const { memberId } = useFinanceRuntime();
  const memberName = useReplica(
    (snapshot) => snapshot.tables.members.get(memberId)?.name ?? "",
  );
  const householdName = useReplica(
    (snapshot) => snapshot.household?.name ?? "",
  );

  return (
    <Card padding="sm" css={styles.root}>
      <SignedInMember memberName={memberName} householdName={householdName} />
    </Card>
  );
}

const styles = stylex.create({
  root: {
    display: { default: null, [breakpoints.md]: "none" },
  },
});
