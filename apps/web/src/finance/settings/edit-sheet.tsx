"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { cluster, stack } from "@tuja/ui/primitives/stack.stylex";
import { useId, type ReactNode, type RefObject, type SubmitEvent } from "react";
import { t } from "#src/i18n.ts";
import { PaneSheet } from "../shell/pane-sheet.tsx";

interface EditSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** Saves the form; returns false to keep the sheet open. */
  onSave: () => boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** A destructive action at the end of the actions, such as "Delete". */
  danger?: { label: string; onAction: () => void };
  children: ReactNode;
}

/** The sheet every Settings list opens to add or edit one row: the fields, then Save and Cancel. */
export function EditSheet({
  isOpen,
  onClose,
  title,
  onSave,
  initialFocusRef,
  danger,
  children,
}: EditSheetProps) {
  const headingId = useId();
  return (
    <PaneSheet
      isOpen={isOpen}
      onClose={onClose}
      label={title}
      initialFocusRef={initialFocusRef}
    >
      {isOpen ? (
        <form
          aria-labelledby={headingId}
          noValidate
          css={[stack.group, styles.form]}
          onSubmit={(event: SubmitEvent<HTMLFormElement>) => {
            event.preventDefault();
            if (onSave()) onClose();
          }}
        >
          <Heading id={headingId} level={2} look="h3">
            {title}
          </Heading>
          <div css={stack.item}>{children}</div>
          <div css={[cluster.tight, styles.actions]}>
            <Button type="submit" look="primary">
              {t({ en: "Save", zh: "保存" })}
            </Button>
            <Button look="ghost" onClick={onClose}>
              {t({ en: "Cancel", zh: "取消" })}
            </Button>
            {danger ? (
              <Button
                look="danger"
                css={styles.danger}
                onClick={() => {
                  danger.onAction();
                  onClose();
                }}
              >
                {danger.label}
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
    </PaneSheet>
  );
}

const styles = stylex.create({
  form: {
    maxInlineSize: "32rem",
    marginInline: "auto",
  },
  actions: {
    justifyContent: "flex-start",
  },
  danger: {
    marginInlineStart: "auto",
  },
});
