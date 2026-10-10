"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, useRef } from "react";
import { t } from "#src/i18n.ts";
import { PaneSheet } from "../shell/pane-sheet.tsx";
import type { MemberRow } from "../sync/row-schemas.ts";

interface RemoveMemberSheetProps {
  /** The Member to remove; null keeps the sheet closed. */
  member: MemberRow | null;
  busy: boolean;
  onConfirm: (member: MemberRow) => void;
  onClose: () => void;
}

/** Asks the owner to confirm that a Member loses access, and says what stays. */
export function RemoveMemberSheet({
  member,
  busy,
  onConfirm,
  onClose,
}: RemoveMemberSheetProps) {
  const headingId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const title = `${t({ en: "Remove ", zh: "移除" })}${member?.name ?? ""}${t({ en: "?", zh: "？" })}`;
  return (
    <PaneSheet
      isOpen={member !== null}
      onClose={onClose}
      label={title}
      initialFocusRef={cancelRef}
    >
      {member ? (
        <section aria-labelledby={headingId} css={[stack.group, styles.body]}>
          <Heading id={headingId} level={2} look="h3">
            {title}
          </Heading>
          <div css={stack.tight}>
            <Text as="p">
              {t({
                en: "They are signed out on every device at once. Their passkeys and any invite link for them stop working.",
                zh: "对方会立即在所有设备上退出登录，其通行密钥和邀请链接随即失效。",
              })}
            </Text>
            <Text as="p" tone="muted">
              {t({
                en: "Past transactions keep their name. New transactions can no longer choose them.",
                zh: "过去的交易仍显示其名字，新交易不能再选择此成员。",
              })}
            </Text>
          </div>
          <div css={cluster.tight}>
            <Button
              look="danger"
              loading={busy}
              onClick={() => {
                onConfirm(member);
              }}
            >
              {t({ en: "Remove member", zh: "移除成员" })}
            </Button>
            <Button ref={cancelRef} look="ghost" onClick={onClose}>
              {t({ en: "Cancel", zh: "取消" })}
            </Button>
          </div>
        </section>
      ) : null}
    </PaneSheet>
  );
}

const styles = stylex.create({
  body: {
    maxInlineSize: "32rem",
    marginInline: "auto",
  },
});
