import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { rhythm } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { DocLink } from "#src/design-system/guide/doc-link.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { AccessibilityAnnounceSpecimen } from "./accessibility-announce-specimen.tsx";
import { AccessibilityHitAreaSpecimen } from "./accessibility-hit-area-specimen.tsx";
import { AccessibilityKeyboardSpecimen } from "./accessibility-keyboard-specimen.tsx";

export function AccessibilityShowcase() {
  return (
    <>
      <GuideSection
        title={t({ en: "Show where focus is.", zh: "让焦点始终可见。" })}
        lead={t({
          en: "When the keyboard moves focus to a control, the control draws a 2px accent ring, and a group with one choice is a single Tab stop that the arrow keys move through. Tab through the row below.",
          zh: "键盘把焦点移到控件上时，控件会画出 2px 的强调色焦点环；只能选一项的组合只占一个 Tab 停靠点，用方向键在组内移动。按 Tab 依次经过下面这一行。",
        })}
      >
        <Stage>
          <AccessibilityKeyboardSpecimen />
        </Stage>
        <GuideNote>
          {t({
            en: "Build your own button, like the last, on buttonReset.base for the ring and the tap area.",
            zh: "自建按钮（例如最后那个）请基于 buttonReset.base，它已带有焦点环与点按范围。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Inside an ancestor that clips overflow, use a11y.focusRingInset, or the ring is cut off.",
            zh: "在会裁切溢出内容的祖先元素内，请改用 a11y.focusRingInset，否则焦点环会被截掉。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Give every tap 44px.", zh: "每次点按都有 44px。" })}
        lead={t({
          en: "On a touch screen, Button, Chip, Switch and the other controls take a tap across at least 44px without growing, and show no tap flash. The dashed box shows that area.",
          zh: "在触摸屏上，Button、Chip、Switch 等控件都能在至少 44px 的范围内响应点按，自身不会变大，也没有点按闪烁。虚线框标出了这个范围。",
        })}
      >
        <Stage>
          <AccessibilityHitAreaSpecimen />
        </Stage>
        <GuideNote>
          {t({
            en: "Links, Slider and text fields add no area; a Checkbox takes the tap on its whole label.",
            zh: "链接、Slider 与文本字段没有额外范围；Checkbox 由整个标签响应点按。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Add a11y.touchTarget to any other control; an ancestor that clips overflow cuts it off.",
            zh: "其他自建控件请加上 a11y.touchTarget；会裁切溢出内容的祖先元素会把这个范围截掉。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({ en: "Write for the ear.", zh: "为耳朵而写。" })}
        lead={t({
          en: "@tuja/ui ships no copy, so every name and message a screen reader reads is a prop you pass. An error is read at once and interrupts, while a status waits for a pause: save the address below with and without an @.",
          zh: "@tuja/ui 不含任何文案，读屏软件朗读的每个名称和消息都是你传入的属性。错误一出现就会被朗读并打断当前内容，状态消息则会等到停顿时再读：在下面分别保存带 @ 和不带 @ 的地址试试。",
        })}
      >
        <Stage>
          <AccessibilityAnnounceSpecimen />
        </Stage>
        <GuideNote>
          {t({
            en: "Switch has no label prop: give it aria-label, or wrap it in a <label>.",
            zh: "Switch 没有 label 属性：请为它加上 aria-label，或用 <label> 包住它。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "An icon-only MenuButton and a loading Button with no icon also need aria-label.",
            zh: "纯图标的 MenuButton 与不带图标的加载中 Button 也都需要 aria-label。",
          })}
        </GuideNote>
        <GuideNote>
          <DocLink path="/design-system/foundations/iconography" />
          {t({
            en: " shows how to keep an icon out of what a screen reader reads.",
            zh: "一页介绍了如何让读屏软件跳过图标。",
          })}
        </GuideNote>
      </GuideSection>
    </>
  );
}

/** Room around a specimen, so it reads as the picture of the section. */
function Stage({ children }: { children: ReactNode }) {
  return <div css={styles.stage}>{children}</div>;
}

const styles = stylex.create({
  stage: {
    paddingBlock: rhythm.item,
    minInlineSize: 0,
  },
});
