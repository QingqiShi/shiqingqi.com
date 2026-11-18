"use client";

import { ArrowUpIcon } from "@phosphor-icons/react/dist/ssr/ArrowUp";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { PromptField } from "@tuja/ui/components/prompt-field";
import { Spinner } from "@tuja/ui/components/spinner";
import { Text } from "@tuja/ui/components/text";
import { row, stack } from "@tuja/ui/primitives/stack.stylex";
import { controlHeight } from "@tuja/ui/tokens.stylex";
import { useRef, type ReactNode, type RefObject } from "react";
import type { SendFailure } from "#src/assistant/assistant-api.ts";
import { LONG_PASTE_CHARS } from "#src/assistant/check-attachments.ts";
import { useOnline } from "#src/trips/save/use-online.ts";
import { AttachmentChips } from "./attachment-chips.tsx";
import { useSegmentFailureWords } from "./conversation-entries.tsx";
import type { AttachFailure } from "./draft-attachments.ts";
import type {
  DecideFailure,
  TripAssistantModel,
} from "./use-trip-assistant.ts";

export type TextControl = HTMLInputElement | HTMLTextAreaElement;

function useNotices() {
  return {
    send: {
      failed: t({
        en: "The assistant could not finish. Your message is back in the field: send it again.",
        zh: "助手没能完成这次回答。你的消息已放回输入框，可以再发一次。",
      }),
      timeout: t({
        en: "The answer took too long and stopped. Your message is back in the field: ask for less at a time.",
        zh: "回答用时太长，已停止。你的消息已放回输入框，试着一次少问一些。",
      }),
      cut_off: t({
        en: "The answer was cut off. Your message is back in the field: ask again, or ask for less at once.",
        zh: "回答被截断了。你的消息已放回输入框，可以再问一次，或一次少问一些。",
      }),
      too_long: t({
        en: "That message is too long. Shorten it and send it again.",
        zh: "这条消息太长了，请缩短后再发送。",
      }),
      busy: t({
        en: "The assistant is still answering your last message. Wait for it, then send this.",
        zh: "助手还在回答你上一条消息，请等它答完再发送。",
      }),
      attachments: t({
        en: "The attachments were not taken: at most 4 in a message, a PDF up to 3 MB, 4 MB in all, as images, PDFs or text.",
        zh: "附件没有被接收：一条消息最多 4 个，PDF 最大 3 MB，合计不超过 4 MB，只收图片、PDF 和文字。",
      }),
      request_failed: t({
        en: "The message did not go through. Check the connection and try again.",
        zh: "消息没有发送成功，请检查网络后再试。",
      }),
    } satisfies Record<SendFailure, string>,
    attach: {
      too_many: t({
        en: "A message takes at most 4 attachments.",
        zh: "一条消息最多带 4 个附件。",
      }),
      too_large: t({
        en: "That is too large: a PDF can be up to 3 MB, and all attachments together up to 4 MB.",
        zh: "附件太大：PDF 最大 3 MB，所有附件合计不超过 4 MB。",
      }),
      unsupported: t({
        en: "Only photos, screenshots and PDFs can be attached.",
        zh: "只能添加照片、截图和 PDF。",
      }),
      unreadable: t({
        en: "That image could not be opened. Try a screenshot of it instead.",
        zh: "这张图片打不开，请改用它的截图。",
      }),
    } satisfies Record<AttachFailure, string>,
    decide: {
      conflict: t({
        en: "The trip changed in the same place, so this could not be done.",
        zh: "行程的同一处已经改过，所以没能完成。",
      }),
      busy: t({
        en: "Wait until the assistant has answered, then try again.",
        zh: "请等助手答完后再试。",
      }),
      request_failed: t({
        en: "That did not go through. Try again.",
        zh: "操作没有成功，请再试一次。",
      }),
    } satisfies Record<DecideFailure, string>,
  };
}

/** The line above the text: what runs now, or what went wrong last. */
function useStatusLine(
  model: TripAssistantModel,
  isOnline: boolean,
): ReactNode {
  const notices = useNotices();
  const segmentFailureWords = useSegmentFailureWords();
  const status = (words: ReactNode) => (
    <div css={[row.tight, styles.status]}>{words}</div>
  );
  const working = (words: string) =>
    status(
      <span role="status" css={row.tight}>
        <Spinner size="sm" aria-hidden />
        <Text as="span" look="bodySmall" tone="muted">
          {words}
        </Text>
      </span>,
    );
  const alert = (words: string) =>
    status(
      <div role="alert">
        <Text look="bodySmall" tone="destructive">
          {words}
        </Text>
      </div>,
    );
  if (!isOnline) {
    return status(
      <Text look="bodySmall" tone="muted">
        {t({
          en: "You are offline. The assistant comes back with the connection.",
          zh: "你现在处于离线状态，恢复连接后才能使用助手。",
        })}
      </Text>,
    );
  }
  if (model.isReading) {
    return working(t({ en: "Reading the attachment…", zh: "正在读取附件…" }));
  }
  if (model.isRunning) {
    return working(t({ en: "Answering…", zh: "正在回答…" }));
  }
  if (model.switching === "new") {
    return working(
      t({
        en: "Writing a summary and starting a new conversation…",
        zh: "正在写小结，并开始新对话…",
      }),
    );
  }
  if (model.segmentFailure) {
    return alert(segmentFailureWords[model.segmentFailure]);
  }
  if (model.sendFailure) return alert(notices.send[model.sendFailure]);
  if (model.decideFailure) return alert(notices.decide[model.decideFailure]);
  if (model.attachFailure) return alert(notices.attach[model.attachFailure]);
  if (model.isPreparing) {
    return working(t({ en: "Getting the image ready…", zh: "正在准备图片…" }));
  }
  return null;
}

/**
 * The field where the person writes to the assistant, with the files that
 * go with the message: "+" adds photos and PDFs, a pasted image becomes a
 * file, and a pasted text over the limit becomes a file too, as only the
 * reader may see it.
 */
export function AssistantPromptField({
  model,
  fieldRef,
  onFocus,
  label: givenLabel,
  placeholder,
  stacked = false,
  filePickerRef,
  onBeforeSend,
}: {
  model: TripAssistantModel;
  fieldRef?: RefObject<TextControl | null>;
  /** Called when the field takes focus, so that the conversation opens. */
  onFocus?: () => void;
  /** The label and placeholder, in place of the one for a trip. */
  label?: string;
  /** The hint in the empty field, where it says more than the label. */
  placeholder?: string;
  /** The text takes the full width, with "+" under it, for a prompt that leads a page. */
  stacked?: boolean;
  /** Ref to the hidden file input, so that another control can open the picker. */
  filePickerRef?: RefObject<HTMLInputElement | null>;
  /** Called just before a message goes out, such as to measure the layout before it changes. */
  onBeforeSend?: () => void;
}) {
  const isOnline = useOnline();
  const statusLine = useStatusLine(model, isOnline);
  const tripLabel = t({
    en: "Ask about the trip or change it",
    zh: "问问这趟行程，或者让助手修改",
  });
  const label = givenLabel ?? tripLabel;
  const addLabel = t({ en: "Add photos or files", zh: "添加照片或文件" });
  const ownFileInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = filePickerRef ?? ownFileInputRef;
  const canSend =
    isOnline &&
    !model.isRunning &&
    model.switching === null &&
    !model.isPreparing;
  const hasContent =
    model.draft.trim().length > 0 || model.attachments.length > 0;

  const chips =
    model.attachments.length > 0 ? (
      <AttachmentChips
        chips={model.attachments.map(({ id, name, kind }) => ({
          key: id,
          name,
          kind,
        }))}
        onRemove={model.removeAttachment}
      />
    ) : null;
  const header =
    statusLine || chips ? (
      <div css={stack.tight}>
        {statusLine}
        {chips}
      </div>
    ) : undefined;

  const addButton = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        multiple
        hidden
        onChange={(event) => {
          const picked = [...(event.currentTarget.files ?? [])];
          event.currentTarget.value = "";
          void model.addFiles(picked);
        }}
      />
      <Button
        size="sm"
        look="ghost"
        aria-label={addLabel}
        title={addLabel}
        disabled={!isOnline || model.isPreparing}
        icon={<PlusIcon weight="bold" role="presentation" />}
        onClick={() => {
          fileInputRef.current?.click();
        }}
      />
    </>
  );
  const sendButton = (
    <Button
      type="submit"
      size="sm"
      look={hasContent && canSend ? "primary" : undefined}
      aria-label={t({ en: "Send", zh: "发送" })}
      disabled={!hasContent || !canSend}
      icon={<ArrowUpIcon weight="bold" role="presentation" />}
    />
  );

  return (
    <div
      css={styles.fill}
      onPaste={(event) => {
        if (!isOnline) return;
        const files = [...event.clipboardData.files].filter(
          (file) =>
            file.type.startsWith("image/") || file.type === "application/pdf",
        );
        if (files.length > 0) {
          event.preventDefault();
          void model.addFiles(files);
          return;
        }
        const pasted = event.clipboardData.getData("text/plain");
        if (pasted.trim().length > LONG_PASTE_CHARS) {
          event.preventDefault();
          model.addPastedText(pasted);
        }
      }}
      onFocus={(event) => {
        // A sheet or a column that closes gives the focus back to this
        // field. That focus comes from the sheet, from the column that
        // leaves (it is inert), or from nothing, and must not open it again.
        // A tap opens it through the click.
        const from = event.relatedTarget;
        if (
          from instanceof Element &&
          !from.closest('[role="dialog"], [inert]')
        ) {
          onFocus?.();
        }
      }}
      onClick={onFocus}
    >
      <PromptField
        ref={fieldRef}
        label={label}
        placeholder={placeholder ?? label}
        value={model.draft}
        onValueChange={model.setDraft}
        onSubmit={() => {
          if (!canSend) return;
          onBeforeSend?.();
          void model.send(model.draft, model.attachments);
        }}
        multiline
        disabled={!isOnline}
        header={header}
        tools={stacked ? addButton : undefined}
        action={
          stacked ? (
            sendButton
          ) : (
            <div css={row.tight}>
              {addButton}
              {sendButton}
            </div>
          )
        }
      />
    </div>
  );
}

const styles = stylex.create({
  fill: {
    flexGrow: 1,
    minInlineSize: 0,
  },
  status: {
    justifyContent: "space-between",
    minBlockSize: controlHeight.sm,
  },
});
