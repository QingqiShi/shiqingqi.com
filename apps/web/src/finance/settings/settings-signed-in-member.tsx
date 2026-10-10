"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useFinanceRuntime } from "../replica/use-finance-runtime.ts";
import { useReplica } from "../replica/use-replica.ts";
import { SignedInMember } from "../shell/signed-in-member.tsx";

/** The signed-in Member under the Settings menu below `md`, where the rail that shows it is hidden. */
export function SettingsSignedInMember() {
  const { memberId } = useFinanceRuntime();
  const memberName = useReplica(
    (snapshot) => snapshot.tables.members.get(memberId)?.name ?? "",
  );
  const householdName = useReplica(
    (snapshot) => snapshot.household?.name ?? "",
  );

  return (
    <SignedInMember
      memberName={memberName}
      householdName={householdName}
      css={styles.root}
    />
  );
}

const styles = stylex.create({
  root: {
    display: { default: "flex", [breakpoints.md]: "none" },
    paddingInline: space._2,
  },
});
