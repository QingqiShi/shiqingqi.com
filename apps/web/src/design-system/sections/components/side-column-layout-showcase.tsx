import { t } from "@tuja/i18n";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { FrameBreakout } from "./device-frame.tsx";
import { SideColumnLayoutDemo } from "./side-column-layout-specimens.tsx";

export function SideColumnLayoutShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Open a column beside the page, not over it.",
          zh: "在页面旁打开一栏，而不是盖住它。",
        })}
        lead={t({
          en: "The column pushes the page narrower and stays on the screen, with its title and footer in view while its content scrolls. Where it has no room, children as a function gets isAvailable: false, and the page shows a Sheet instead.",
          zh: "侧栏把页面推窄并停留在屏幕上，内容滚动时标题与底部保持可见。放不下时，以函数形式传入的 children 会得到 isAvailable: false，页面改用 Sheet 显示。",
        })}
      >
        <FrameBreakout>
          <SideColumnLayoutDemo />
        </FrameBreakout>
        <GuideNote>
          {t({
            en: "Opening moves focus into the column. Close and Escape give it back to the button that opened it.",
            zh: "打开时焦点移入侧栏。关闭或按 Escape 后，焦点回到打开它的按钮。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "The layout measures its own width, not the screen's, so it works beside a sidebar too.",
            zh: "布局测量的是自身宽度而不是屏幕宽度，因此在侧边栏旁边同样适用。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Change its width with two tokens.",
          zh: "用两个令牌改变它的宽度。",
        })}
        lead={t({
          en: "inlineSize is the column, and mainMinInlineSize the least room the page keeps beside it. The column shows only where both fit.",
          zh: "inlineSize 是侧栏的宽度，mainMinInlineSize 是页面在它旁边至少保留的宽度。两者都放得下时才显示侧栏。",
        })}
      >
        <UsageSnippet
          code={`import { sideColumnTokens } from "@tuja/ui/components/side-column-layout.stylex";

const styles = stylex.create({
  wide: {
    [sideColumnTokens.inlineSize]: "28rem",
    [sideColumnTokens.mainMinInlineSize]: "40rem",
  },
});

<SideColumnLayout {...props} css={styles.wide} />`}
        />
        <GuideNote>
          {t({
            en: "Keep mainMinInlineSize at least as wide as the column, so the column never covers the middle of the screen.",
            zh: "让 mainMinInlineSize 不小于侧栏宽度，侧栏就永远不会盖住屏幕中线。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="side-column-layout" />
    </>
  );
}
