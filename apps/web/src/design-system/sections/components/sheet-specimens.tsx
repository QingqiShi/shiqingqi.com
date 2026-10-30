"use client";

import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Sheet } from "@tuja/ui/components/sheet";
import { Text } from "@tuja/ui/components/text";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { useState } from "react";

/** The consumer owns `isOpen`, so a specimen has to own it too. */
export function ShortSheetDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const close = () => {
    setIsOpen(false);
  };

  return (
    <>
      <Button
        look="primary"
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {t({ en: "Open a short sheet", zh: "打开短内容面板" })}
      </Button>
      <Sheet
        isOpen={isOpen}
        onClose={close}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        title={t({ en: "Archive this list?", zh: "归档这个清单？" })}
      >
        <div css={stack.item}>
          <Text tone="muted">
            {t({
              en: "The card is as tall as this text. Drag it down by its grabber, press Escape, or click the dimmed page to close it.",
              zh: "卡片的高度与这段文字相同。按住拖动条向下拖、按Escape或点击压暗的页面都可以关闭它。",
            })}
          </Text>
          <Button look="primary" onClick={close}>
            {t({ en: "Archive", zh: "归档" })}
          </Button>
        </div>
      </Sheet>
    </>
  );
}

const PARAGRAPH_COUNT = 12;

export function TallSheetDemo() {
  const [isOpen, setIsOpen] = useState(false);
  const paragraph = t({
    en: "Content taller than the screen scrolls inside the card. The page behind stays where it was, and a pull down from the top of the content closes the sheet.",
    zh: "高于屏幕的内容在卡片内部滚动。背后的页面保持原位；从内容顶部向下拉即可关闭面板。",
  });

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true);
        }}
      >
        {t({ en: "Open a tall sheet", zh: "打开长内容面板" })}
      </Button>
      <Sheet
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false);
        }}
        closeLabel={t({ en: "Close", zh: "关闭" })}
        title={t({ en: "Release notes", zh: "更新说明" })}
      >
        <div css={stack.item}>
          {Array.from({ length: PARAGRAPH_COUNT }, (_, index) => (
            <Text key={index}>{paragraph}</Text>
          ))}
        </div>
      </Sheet>
    </>
  );
}
