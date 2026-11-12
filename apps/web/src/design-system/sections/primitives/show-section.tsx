import { t } from "@tuja/i18n";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { ApiGrid, type ApiEntry } from "./api-grid.tsx";

export function ShowSection() {
  const api: ApiEntry[] = [
    {
      token: "show.wide",
      meta: "display · view ≥ 44rem",
      description: t({
        en: "Shows the element where its view is wide enough for the wide form.",
        zh: "在所在的视图足够宽、放得下宽形式时显示该元素。",
      }),
    },
    {
      token: "show.narrow",
      meta: "display · view < 44rem",
      description: t({
        en: "Shows the element where its view is narrow, such as on a phone or beside a sidebar on a small screen.",
        zh: "在所在的视图较窄时显示该元素，例如手机上，或小屏幕的侧边栏旁。",
      }),
    },
  ];

  return (
    <Showcase label={t({ en: "Show", zh: "显示" })}>
      <ShowcaseHelper>
        {t({
          en: "Two forms of one content, such as a Table in a wide view and a List in a narrow one, each in its own wrapper. They measure the Navigation split view or Navigation stack around them, not the screen, so the content changes form by the room that it has. Outside a Navigation split view or a Navigation stack, wide always shows and narrow never does.",
          zh: "同一内容的两种形式，例如宽视图里的表格与窄视图里的列表，各放在自己的包裹元素中。它们测量外层的导航分栏视图或导航栈而非屏幕，因此内容按自己实际拥有的宽度改变形式。在导航分栏视图或导航栈之外，wide 始终显示，narrow 始终不显示。",
        })}
      </ShowcaseHelper>
      <ApiGrid entries={api} />
      <UsageSnippet
        code={`import { show } from "@tuja/ui/primitives/show.stylex";

<div css={show.wide}>
  <Table caption="Spending">…</Table>
</div>
<div css={show.narrow}>
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
