"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";

/**
 * A bounded mock page with a centred dialog floating over it — the case the
 * measured ramp exists for. The blur radiates on all four sides and the page is
 * sharp again well before the mock page's own edges. Shared with the melt demo
 * below, so that demo toggles the same shape this one introduces.
 */
export function BlurredDialogMock({ isShown }: { isShown?: boolean }) {
  return (
    <div css={[corner.radius_3, styles.mockPage]}>
      <div css={[flex.col, styles.mockContent]}>
        <Text look="bodySmall">
          {t({
            en: "This draft has three edits that haven't been saved to the shared copy yet.",
            zh: "这份草稿有三处修改尚未保存到共享副本。",
          })}
        </Text>
        <Text look="bodySmall">
          {t({
            en: "Anyone opening the shared copy still sees the version from Tuesday.",
            zh: "打开共享副本的人看到的仍是周二的版本。",
          })}
        </Text>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Autosave runs every five minutes while the editor stays open.",
            zh: "编辑器保持打开时，自动保存每五分钟运行一次。",
          })}
        </Text>
      </div>
      <ProgressiveBlur isShown={isShown}>
        <div css={[popoverSurface.base, styles.mockDialog]}>
          <Text look="bodySmall" weight="semibold">
            {t({ en: "Discard three edits?", zh: "放弃三处修改？" })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "The shared copy keeps Tuesday's version. This cannot be undone.",
              zh: "共享副本将保留周二的版本。此操作无法撤销。",
            })}
          </Text>
          <div css={[flex.row, styles.mockDialogActions]}>
            <Button size="sm">
              {t({ en: "Keep editing", zh: "继续编辑" })}
            </Button>
            <Button look="primary" size="sm">
              {t({ en: "Discard edits", zh: "放弃修改" })}
            </Button>
          </div>
        </div>
      </ProgressiveBlur>
    </div>
  );
}

/** The consumer owns `isShown`, so a specimen has to own it too. */
export function MeltDemo() {
  const [isShown, setIsShown] = useState(true);

  return (
    <div css={[flex.col, styles.meltStack]}>
      <BlurredDialogMock isShown={isShown} />
      <Button
        size="sm"
        css={styles.meltToggle}
        onClick={() => {
          setIsShown((shown) => !shown);
        }}
      >
        {isShown
          ? t({ en: "Hide blur", zh: "隐藏虚化" })
          : t({ en: "Show blur", zh: "显示虚化" })}
      </Button>
    </div>
  );
}

const styles = stylex.create({
  mockPage: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    // Tall enough for the ramp to read as a ramp — the blur runs from the
    // dialog out to the box's edge, so a short box spends the whole reach at
    // full strength and the demo looks like one flat blur — and no taller,
    // since page the ramp never reaches is page with nothing to show.
    minBlockSize: "24rem",
    padding: space._4,
    // No clip: the blur fills this box and takes its corners, and a
    // squircle-cornered clip above the layers makes Chrome drop their masks.
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  // The copy runs the height of the mock rather than sitting in a block at the
  // top: the ramp is only visible where there is page under it, so a dialog
  // centred over a single block would show its blur above and nowhere else.
  mockContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: space._2,
    maxInlineSize: "17rem",
  },
  mockDialog: {
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineStart: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    inlineSize: "min(22rem, 70%)",
    paddingBlock: space._3,
    paddingInline: space._3,
  },
  mockDialogActions: {
    justifyContent: "flex-end",
    gap: space._2,
  },
  meltStack: {
    gap: space._3,
  },
  meltToggle: {
    alignSelf: "flex-start",
  },
});
