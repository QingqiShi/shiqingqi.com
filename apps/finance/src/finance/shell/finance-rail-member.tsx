"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Avatar } from "@tuja/ui/components/avatar";
import { Popover } from "@tuja/ui/components/popover";
import {
  TabViewIconsOnly,
  TabViewLabelsOnly,
} from "@tuja/ui/components/tab-view";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { buttonReset } from "@tuja/ui/primitives/reset.stylex";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { useLayoutEffect, useRef, useState } from "react";
import { useMemberMenu } from "./member-menu-provider.tsx";
import { SignedInMember } from "./signed-in-member.tsx";
import { SyncStatusIndicator } from "./sync-status-indicator.tsx";

interface FinanceRailMemberProps {
  memberName: string;
  householdName: string;
}

/**
 * The bottom of the sidebar and of the rail: the sync status as an icon, and
 * the signed-in Member, which opens who is signed in, to which Household, the
 * full sync status, and sign out.
 *
 * The `TabView` draws it more than once: in its own sidebar, and under the
 * list of each screen, which mounts again with its screen. So `MemberMenuProvider`
 * holds whether the menu is open, and the copy that shows opens it: a screen that
 * loads under an open menu does not close it.
 */
export function FinanceRailMember({
  memberName,
  householdName,
}: FinanceRailMemberProps) {
  const { isOpen, setIsOpen } = useMemberMenu();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [isShown, setIsShown] = useState(false);
  // Which copy shows can change under an open menu, when a screen with no
  // list follows a screen with one.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!isOpen || root === null) return;
    const measure = () => {
      setIsShown(root.getClientRects().length !== 0);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(root);
    return () => {
      observer.disconnect();
    };
  }, [isOpen]);
  const label = `${t({ en: "Signed in as", zh: "当前登录：" })} ${memberName}`;
  return (
    <div ref={rootRef} css={[stack.item, styles.root]}>
      <TabViewIconsOnly>
        <SyncStatusIndicator compact />
      </TabViewIconsOnly>
      <div css={[row.tight, styles.member]}>
        <Popover
          open={isOpen && isShown}
          onOpenChange={(isNextOpen) => {
            // A copy that left the document still hears the focus go to the
            // menu of the copy that came, and must not close that menu.
            if (isNextOpen || rootRef.current?.isConnected === true) {
              setIsOpen(isNextOpen);
            }
          }}
          placement="right-end"
          aria-label={label}
          css={styles.popover}
          trigger={(props) => (
            <button
              {...props}
              aria-label={label}
              css={[buttonReset.base, corner.radius_round, row.tight]}
            >
              <Avatar name={memberName} aria-hidden />
              <TabViewLabelsOnly>
                <span css={typeRole.label}>{memberName}</span>
              </TabViewLabelsOnly>
            </button>
          )}
        >
          <SignedInMember
            memberName={memberName}
            householdName={householdName}
          />
        </Popover>
        <span css={styles.sync}>
          <TabViewLabelsOnly>
            <SyncStatusIndicator compact />
          </TabViewLabelsOnly>
        </span>
      </div>
    </div>
  );
}

const styles = stylex.create({
  root: {
    flexGrow: 1,
    alignItems: "center",
    minInlineSize: 0,
  },
  // In the sidebar, the sync status is at the end of the Member's line.
  member: {
    justifyContent: "center",
    inlineSize: "100%",
    minInlineSize: 0,
  },
  sync: {
    marginInlineStart: "auto",
  },
  popover: {
    inlineSize: "16rem",
  },
});
