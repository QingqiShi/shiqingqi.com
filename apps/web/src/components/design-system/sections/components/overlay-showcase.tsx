"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { Heading } from "@tuja/ui/components/heading";
import { Overlay } from "@tuja/ui/components/overlay";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { Showcase } from "../../showcase.tsx";

export function OverlayShowcase() {
  const [isOpen, setIsOpen] = useState(false);
  return (
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
        closeIcon={<XIcon role="presentation" />}
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
});
