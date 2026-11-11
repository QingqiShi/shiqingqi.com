import { ChartBarIcon } from "@phosphor-icons/react/dist/ssr/ChartBar";
import { GearSixIcon } from "@phosphor-icons/react/dist/ssr/GearSix";
import { ListBulletsIcon } from "@phosphor-icons/react/dist/ssr/ListBullets";
import { NotePencilIcon } from "@phosphor-icons/react/dist/ssr/NotePencil";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { getLocale } from "@tuja/i18n/server-locale";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { DocPage } from "#src/design-system/doc-page.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { getPatternCopy } from "#src/design-system/patterns/get-pattern-copy.ts";
import type { PatternPath } from "#src/design-system/patterns/pattern-paths.ts";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { designSystemMetadata } from "../design-system-metadata.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { locale } = await props.params;
  return designSystemMetadata({
    locale: validateLocale(locale),
    path: "/design-system/patterns",
  });
}

const PATTERNS: readonly { path: PatternPath; icon: ReactNode }[] = [
  {
    path: "/design-system/patterns/dashboard",
    icon: <ChartBarIcon weight="bold" />,
  },
  {
    path: "/design-system/patterns/settings",
    icon: <GearSixIcon weight="bold" />,
  },
  {
    path: "/design-system/patterns/list",
    icon: <ListBulletsIcon weight="bold" />,
  },
  {
    path: "/design-system/patterns/form",
    icon: <NotePencilIcon weight="bold" />,
  },
];

const SCREEN_SHAPE = `<TabView label={appName} items={destinations}>
  <NavigationSplitView
    content={{
      label: title,
      node: (
        <div css={stack.group}>
          <PageHeader title={title} actions={mainAction} />
          <StatGroup>{figures}</StatGroup>
          <Columns ratio="2:1">
            <Card>{rows}</Card>
            <Card>{aside}</Card>
          </Columns>
        </div>
      ),
    }}
  />
</TabView>`;

export default function PatternsPage() {
  const locale = getLocale();
  const copy = getPatternCopy();
  return (
    <DocPage
      path="/design-system/patterns"
      description={t({
        en: "Whole screens, built only from components. Each one opens in its own app frame, so you can resize it, switch the theme and press every control.",
        zh: "只用组件搭成的完整页面。每个页面都在自己的应用框架里打开，你可以调整窗口大小、切换主题，并操作每一个控件。",
      })}
    >
      <GuideSection
        title={t({
          en: "Start from the nearest screen.",
          zh: "从最接近的页面开始。",
        })}
        lead={t({
          en: "Open the pattern that is closest to the screen you need, then change its content. The layout, the hierarchy and the phone version come with it.",
          zh: "打开和你要做的页面最接近的模式，再替换其中的内容。布局、层次和手机版本都会一起带过来。",
        })}
      >
        <List>
          {PATTERNS.map(({ path, icon }) => (
            <ListRow
              key={path}
              href={getLocalePath(path, locale)}
              leading={icon}
              leadingShape="square"
              detail={copy[path].description}
              wrap
            >
              {copy[path].name}
            </ListRow>
          ))}
        </List>
        <GuideNote>
          {t({
            en: "Narrow the window, and the sidebar of each pattern becomes a rail of icons, then a tab bar.",
            zh: "把窗口调窄，每个模式的侧栏会先变成一列图标，再变成底部标签栏。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Let the components carry the hierarchy.",
          zh: "让组件来承担层次。",
        })}
        lead={t({
          en: "Every pattern has the same shape from the outside in: the app frame, the page header, the figures, then cards, lists, tables or setting rows. None of them writes a style of its own.",
          zh: "每个模式由外向内都是同一个结构：应用框架、页头、关键数字，然后是卡片、列表、表格或设置行。它们都没有自己写一条样式。",
        })}
      >
        <UsageSnippet code={SCREEN_SHAPE} />
        <GuideNote>
          {t({
            en: "A form ends with a FormFooter, and a settings page puts one SettingRow per setting.",
            zh: "表单以 FormFooter 结尾，设置页每个设置用一行 SettingRow。",
          })}
        </GuideNote>
      </GuideSection>
    </DocPage>
  );
}
