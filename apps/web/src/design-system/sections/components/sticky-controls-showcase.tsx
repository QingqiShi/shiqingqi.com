import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { FilterBar } from "./sticky-controls-specimens.tsx";

export function StickyControlsShowcase() {
  const usage = `import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";

<StickyControls css={styles.bar}>
  <StickyControlGroup>
    <MediaTypeToggle />
    <SortFilter />
  </StickyControlGroup>
  <StickyControlGroup css={styles.trailing}>
    <ResetFilter />
  </StickyControlGroup>
</StickyControls>`;

  return (
    <>
      <Showcase
        label={t({ en: "Sticky controls", zh: "粘性控件" })}
        leadsWithText
      >
        <ShowcaseHelper>
          {t({
            en: "Scroll this page: the row below parks near the top of the viewport and the cards blur as they pass under each of its two groups, while the page between the groups stays sharp. The controls are live.",
            zh: "滚动本页：下方这一行会停在视口顶部附近，卡片从其两个控件组下方经过时被虚化，两组之间的页面则保持清晰。其中的控件均可操作。",
          })}
        </ShowcaseHelper>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "One row of page chrome — a filter bar — parked under the header strip while the page scrolls past it, with the page blurred around each group of its controls the whole time it holds there. It melts away as soon as the row scrolls back into the flow of the page. The clearance it parks at is the one the header's own control groups occupy, so the two never sit on top of each other.",
            zh: "一行页面控件——例如筛选栏——在页面从其下方滚过时停在页头下方，停住期间页面在其每个控件组周围渐进虚化。一旦这一行重新回到页面的文档流中，虚化随即消退。它停放的位置正是页头自身控件组所占的那段间距，因此两者不会互相压住。",
          })}
        </Text>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "A blur per group rather than one across the row: a row with filters at the start and a prompt at the end leaves the page between them sharp, the way the header's own groups leave the middle of the page alone. Every blur is painted on one plane under all the controls, so no group blurs the controls of another. HeaderFooterLayout and Sheet keep that plane for everything that floats in them. Anywhere else, this page included, the row keeps its own.",
            zh: "每个控件组各有一片虚化，而非整行一片：筛选控件在行首、提示框在行尾的一行，两者之间的页面保持清晰，正如页头自身的控件组不会触及页面中部。所有虚化都绘制在位于全部控件之下的同一个平面上，因此任何一组都不会虚化另一组的控件。HeaderFooterLayout 和 Sheet 为其中的全部悬浮控件保留这个平面。在其他地方（包括本页），这一行自带一个。",
          })}
        </Text>
        <Specimen
          caption={t({
            en: "a filter bar over a list",
            zh: "列表之上的筛选栏",
          })}
        >
          <FilterBar />
        </Specimen>
      </Showcase>

      <UsageSnippet code={usage} />

      <PropsTable component="sticky-controls" />
      <PropsTable component="sticky-control-group" />
    </>
  );
}
