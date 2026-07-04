"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Overlay } from "@tuja/ui/components/overlay";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

export function OverlayShowcase() {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Showcase label={t({ en: "Overlay", zh: "覆盖层" })}>
        <div css={[flex.col, styles.stack]}>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "A full-screen overlay that traps focus, locks scroll, closes on Escape or backdrop click, and restores focus on exit. Open it, then press Escape or use the close button.",
              zh: "全屏覆盖层：捕获焦点、锁定滚动，按 Escape 或点击背景即可关闭，退出时恢复焦点。打开后可按 Escape 或使用关闭按钮。",
            })}
          </Text>
          <div>
            <Button
              variant="primary"
              onClick={() => {
                setIsOpen(true);
              }}
            >
              {t({ en: "Open overlay", zh: "打开覆盖层" })}
            </Button>
          </div>
        </div>

        <Overlay
          isOpen={isOpen}
          onClose={() => {
            setIsOpen(false);
          }}
          closeLabel={t({ en: "Close", zh: "关闭" })}
          aria-label={t({ en: "Example overlay", zh: "示例覆盖层" })}
        >
          <div css={[flex.col, styles.overlayBody]}>
            <Heading level={2}>
              {t({ en: "Overlay content", zh: "覆盖层内容" })}
            </Heading>
            <Text tone="muted">
              {t({
                en: "The consumer owns this content; the overlay owns the backdrop, focus trap, scroll lock, and close affordance. Press Escape or click the backdrop to dismiss.",
                zh: "内容由使用方掌控；覆盖层负责背景、焦点捕获、滚动锁定与关闭控件。按 Escape 或点击背景即可关闭。",
              })}
            </Text>
          </div>
        </Overlay>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { Overlay } from "@tuja/ui/components/overlay";
import { useState } from "react";

const [isOpen, setIsOpen] = useState(false);

<Overlay
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  closeLabel="Close"
  aria-label="Trailer"
>
  {/* content */}
</Overlay>`}
          label="tsx"
        />
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "isOpen",
              type: "boolean",
              required: true,
              description: t({
                en: "Whether the overlay is shown; the consumer owns this state.",
                zh: "覆盖层是否显示；该状态由使用方掌控。",
              }),
            },
            {
              name: "onClose",
              type: "() => void",
              required: true,
              description: t({
                en: "Called on dismissal — Escape, a backdrop click, or the close button.",
                zh: "在关闭时调用——Escape、点击背景或关闭按钮。",
              }),
            },
            {
              name: "closeLabel",
              type: "string",
              required: true,
              description: t({
                en: "Accessible label for the close button; the package ships no i18n, so the consumer supplies it.",
                zh: "关闭按钮的可访问标签；该包不内置 i18n，由使用方提供。",
              }),
            },
            {
              name: "aria-label | aria-labelledby",
              type: "string",
              required: true,
              description: t({
                en: "Names the dialog (WCAG 4.1.2) — supply exactly one of the two.",
                zh: "为对话框命名（WCAG 4.1.2）——两者必须二选一。",
              }),
            },
            {
              name: "closeIcon",
              type: "ReactNode",
              description: t({
                en: "Icon rendered inside the close button. Defaults to the built-in X icon.",
                zh: "关闭按钮内渲染的图标。默认为内置的 X 图标。",
              }),
            },
            {
              name: "portalTarget",
              type: "Element | DocumentFragment | null",
              defaultValue: "document.body",
              description: t({
                en: "Where to render the portal; pass null to defer until a target is available.",
                zh: "portal 渲染到哪里；传入 null 可延迟到目标可用为止。",
              }),
            },
            {
              name: "initialFocusRef",
              type: "RefObject<HTMLElement | null>",
              description: t({
                en: "Element to focus when the overlay opens; falls back to the close button.",
                zh: "覆盖层打开时聚焦的元素；回退到关闭按钮。",
              }),
            },
            {
              name: "children",
              type: "ReactNode",
              description: t({
                en: "The overlay's content; the consumer owns it.",
                zh: "覆盖层的内容；由使用方掌控。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={
            <div css={styles.dialogSample}>
              <span css={styles.dialogClose} aria-hidden>
                {"×"}
              </span>
              <Text as="span" variant="bodySmall" weight="semibold">
                {t({ en: "Official trailer", zh: "官方预告" })}
              </Text>
              <div css={styles.dialogBar} />
              <div css={styles.dialogBarShort} />
            </div>
          }
          doCaption={t({
            en: "Always name the dialog with aria-label or aria-labelledby so it's announced on open.",
            zh: "始终用 aria-label 或 aria-labelledby 为对话框命名，以便打开时被宣读。",
          })}
          dont={
            <div css={styles.dialogSample}>
              <span css={styles.dialogClose} aria-hidden>
                {"×"}
              </span>
              <div css={styles.dialogBar} />
              <div css={styles.dialogBarShort} />
            </div>
          }
          dontCaption={t({
            en: "Don't rely on the close button alone — an unnamed dialog gives screen-reader users no context.",
            zh: "不要只依赖关闭按钮——未命名的对话框无法为屏幕阅读器用户提供上下文。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    gap: space._3,
    alignItems: "flex-start",
  },
  overlayBody: {
    gap: space._3,
    padding: space._8,
    maxInlineSize: "60ch",
  },
  dialogSample: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    inlineSize: "100%",
    padding: space._3,
    paddingInlineEnd: space._6,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    borderRadius: border.radius_3,
    backgroundColor: color.bgSurface,
  },
  dialogClose: {
    position: "absolute",
    insetBlockStart: space._2,
    insetInlineEnd: space._2,
    color: color.textSubtle,
    fontSize: font.uiBody,
    lineHeight: font.lineHeight_0,
  },
  dialogBar: {
    blockSize: space._1,
    inlineSize: "100%",
    borderRadius: border.radius_1,
    backgroundColor: color.surfaceNeutralSubtle,
  },
  dialogBarShort: {
    blockSize: space._1,
    inlineSize: "60%",
    borderRadius: border.radius_1,
    backgroundColor: color.surfaceNeutralSubtle,
  },
});
