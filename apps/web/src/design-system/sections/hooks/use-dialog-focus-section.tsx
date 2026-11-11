"use client";

import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { color } from "@tuja/ui/color.stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Text } from "@tuja/ui/components/text";
import { useDialogFocus } from "@tuja/ui/hooks/use-dialog-focus";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { shadow, space } from "@tuja/ui/tokens.stylex";
import { useRef, useState } from "react";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen, SpecimenGrid } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { hooksSpecimen } from "./hooks-specimen.stylex.ts";

/** A modal whose focus lifecycle is fully managed by `useDialogFocus`. */
function DialogSpecimen() {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocus({
    isOpen: open,
    dialogRef,
    onClose: () => {
      setOpen(false);
    },
  });
  const openLabel = t({ en: "Delete list…", zh: "删除清单…" });
  const dialogLabel = t({ en: "Delete confirmation", zh: "删除确认" });
  const title = t({ en: "Delete this list?", zh: "删除该清单？" });
  const body = t({
    en: "This removes the list and everything in it. This action cannot be undone.",
    zh: "这将删除清单及其中所有内容，此操作无法撤销。",
  });
  const cancel = t({ en: "Cancel", zh: "取消" });
  const confirm = t({ en: "Delete", zh: "删除" });
  return (
    <div css={[stack.item, styles.dialogHost]}>
      <Button
        onClick={() => {
          setOpen(true);
        }}
      >
        {openLabel}
      </Button>
      {open ? (
        <div
          ref={dialogRef}
          role="dialog"
          aria-modal="true"
          aria-label={dialogLabel}
          css={[stack.item, corner.radius_3, styles.dialogCard]}
        >
          <div css={stack.text}>
            <Heading level={3}>{title}</Heading>
            <Text look="bodySmall" tone="muted">
              {body}
            </Text>
          </div>
          <div css={[cluster.tight, styles.dialogActions]}>
            <Button
              onClick={() => {
                setOpen(false);
              }}
            >
              {cancel}
            </Button>
            <Button
              look="primary"
              onClick={() => {
                setOpen(false);
              }}
            >
              {confirm}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function UseDialogFocusSection() {
  return (
    <Showcase label="useDialogFocus" labelLook="code">
      <ShowcaseHelper>
        {t({
          en: "The full focus lifecycle for a modal in one call: it moves focus into the dialog on open, traps Tab and Shift+Tab inside it, closes on Escape, and restores focus to the trigger on unmount. Use it for any dialog, sheet, or popover that must not leak focus.",
          zh: "一次调用即处理模态的完整焦点生命周期：打开时将焦点移入对话框，把 Tab 与 Shift+Tab 困在其中，按 Escape 关闭，并在卸载时把焦点还给触发元素。适用于任何不得泄漏焦点的对话框、抽屉或弹出层。",
        })}
      </ShowcaseHelper>
      <SpecimenGrid css={hooksSpecimen.tracks}>
        <Specimen
          caption={t({
            en: "Open, then Tab and Escape — focus stays trapped and restores",
            zh: "打开后按 Tab 和 Escape——焦点被困住并会恢复",
          })}
        >
          <DialogSpecimen />
        </Specimen>
      </SpecimenGrid>
      <UsageSnippet
        code={`import { useRef, useState } from "react";
import { useDialogFocus } from "@tuja/ui/hooks/use-dialog-focus";

const dialogRef = useRef(null);
useDialogFocus({ isOpen, dialogRef, onClose: () => setOpen(false) });

<div role="dialog" aria-modal="true" ref={dialogRef}>
  {/* Tab trap, Escape-to-close, focus restore all handled */}
</div>`}
      />
    </Showcase>
  );
}

const styles = stylex.create({
  // useDialogFocus
  dialogHost: {
    alignItems: "flex-start",
    inlineSize: "100%",
  },
  dialogCard: {
    inlineSize: "100%",
    maxInlineSize: "320px",
    padding: space._5,
    backgroundColor: color.popover,
    boxShadow: shadow._4,
  },
  dialogActions: {
    justifyContent: "flex-end",
  },
});
