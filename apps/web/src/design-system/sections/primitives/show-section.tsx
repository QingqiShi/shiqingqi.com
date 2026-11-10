import { t } from "@tuja/i18n";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { ApiGrid, type ApiEntry } from "./api-grid.tsx";

export function ShowSection() {
  const api: ApiEntry[] = [
    {
      token: "show.fromMd",
      meta: "display · TabView ≥ 768px",
      description: t({
        en: "Shows the element where the Tab view shows its rail or sidebar.",
        zh: "在标签视图显示侧轨或侧边栏时显示该元素。",
      }),
    },
    {
      token: "show.belowMd",
      meta: "display · TabView < 768px",
      description: t({
        en: "Shows the element where the Tab view shows its tab bar.",
        zh: "在标签视图显示标签栏时显示该元素。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Show", zh: "显示" })}>
      <ShowcaseHelper>
        {t({
          en: "Two forms of one content, such as a Table on a wide screen and a List on a phone, each in its own wrapper. They measure the Tab view around them, not the screen, so the content changes form where the view does. Outside a Tab view, fromMd always shows and belowMd never does.",
          zh: "同一内容的两种形式，例如宽屏上的表格与手机上的列表，各放在自己的包裹元素中。它们测量外层的标签视图而非屏幕，因此内容与视图在同一宽度改变形式。在标签视图之外，fromMd 始终显示，belowMd 始终不显示。",
        })}
      </ShowcaseHelper>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { show } from "@tuja/ui/primitives/show.stylex";

<div css={show.fromMd}>
  <Table caption="Spending">…</Table>
</div>
<div css={show.belowMd}>
  <List aria-label="Spending">…</List>
</div>`}
      />
      <ShowcaseHelper>
        {t({
          en: "Each one owns the display of its element, so give it to a wrapper, not to a flex row or a grid.",
          zh: "它们各自掌管所在元素的 display，因此请用于包裹元素，而不要用于 flex 行或网格。",
        })}
      </ShowcaseHelper>
    </Showcase>
  );
}
