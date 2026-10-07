import { Button } from "@tuja/ui/components/button";
import { Callout } from "@tuja/ui/components/callout";
import { GuideList } from "#src/design-system/guide/guide-list.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { ThemeFramePair } from "#src/design-system/theme-frame.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { t } from "#src/i18n.ts";

const PIN_SCHEME = `import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

const styles = stylex.create({
  dark: { colorScheme: "dark" },
});

export function NightPreview({ children }: { children: ReactNode }) {
  return <section css={styles.dark}>{children}</section>;
}`;

export function GetStartedLightDark() {
  return (
    <GuideSection
      title={t({ en: "Light and dark", zh: "浅色与深色" })}
      lead={t({
        en: "Every colour Token is a light-dark() pair, and the color-scheme of the element it paints decides which half it uses. There is no second set of Tokens: set color-scheme and every component follows.",
        zh: "每个颜色令牌都是一对 light-dark() 值，由它所绘制元素的 color-scheme 决定取哪一半。没有第二套令牌：设置 color-scheme，每个组件都会随之变化。",
      })}
    >
      <ThemeFramePair>
        <Callout
          intent="success"
          title={t({ en: "Trip saved", zh: "行程已保存" })}
        >
          {t({
            en: "Kyoto, 5 days, opens without a connection.",
            zh: "京都 5 日行程可离线打开。",
          })}
        </Callout>
        <Button look="primary">
          {t({ en: "Share trip", zh: "分享行程" })}
        </Button>
      </ThemeFramePair>
      <GuideList
        items={[
          {
            term: t({ en: "Follow the system", zh: "跟随系统" }),
            value: 'colorScheme: "light dark"',
            note: t({
              en: "On the root, as in the layout above. The page follows the visitor's system setting and changes when they change it.",
              zh: "设在根元素上，如上文的布局所示。页面跟随访客的系统设置，并在设置改变时随之变化。",
            }),
          },
          {
            term: t({ en: "Pin the page", zh: "固定整个页面" }),
            value: 'colorScheme: "dark"',
            note: t({
              en: "On the root, in place of the default. Set it in the server-rendered markup, or in an inline script that runs before the first paint, so the page never flashes the other scheme.",
              zh: "设在根元素上，取代默认值。请在服务端渲染的标记中设置，或在首次绘制前运行的内联脚本中设置，这样页面就不会闪现另一种配色。",
            }),
          },
          {
            term: t({ en: "Pin one part", zh: "固定局部" }),
            value: 'colorScheme: "light"',
            note: t({
              en: "On any element. Every Token inside it resolves to that scheme, whatever the page is set to. The two frames above do this.",
              zh: "设在任意元素上。其中的每个令牌都解析为该配色，不论页面设为什么。上面的两个框就是这样做的。",
            }),
          },
        ]}
      />
      <UsageSnippet code={PIN_SCHEME} />
      <GuideNote>
        {t({
          en: "light-dark() sets the browser floor: Chrome 123, Safari 17.5 and Firefox 120. constants.DARK in @tuja/ui/tokens.stylex is a media query on the system setting, so it ignores a pinned scheme; a colour Token does not.",
          zh: "light-dark() 决定了浏览器的最低版本：Chrome 123、Safari 17.5 与 Firefox 120。@tuja/ui/tokens.stylex 中的 constants.DARK 是针对系统设置的媒体查询，因此会忽略被固定的配色；颜色令牌则不会。",
        })}
      </GuideNote>
    </GuideSection>
  );
}
