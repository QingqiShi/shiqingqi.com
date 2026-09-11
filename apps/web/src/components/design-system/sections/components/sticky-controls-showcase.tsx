import * as stylex from "@stylexjs/stylex";
import { Text } from "@tuja/ui/components/text";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";
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
      <Showcase label={t({ en: "Sticky controls", zh: "粘性控件" })}>
        <ShowcaseHelper>
          {t({
            en: "Scroll this page: the row below parks near the top of the viewport and the cards blur as they pass under each of its two groups, while the page between the groups stays sharp. The controls are live.",
            zh: "滚动本页：下方这一行会停在视口顶部附近，卡片从其两个控件组下方经过时被虚化，两组之间的页面则保持清晰。其中的控件均可操作。",
          })}
        </ShowcaseHelper>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "One row of page chrome — a filter bar — parked under the header strip while the page scrolls past it, with the page blurred around each group of its controls the whole time it holds there. It melts away as soon as the row scrolls back into the flow of the page. The clearance it parks at is the one the header's own control groups occupy, so the two never sit on top of each other.",
              zh: "一行页面控件——例如筛选栏——在页面从其下方滚过时停在页头下方，停住期间页面在其每个控件组周围渐进虚化。一旦这一行重新回到页面的文档流中，虚化随即消退。它停放的位置正是页头自身控件组所占的那段间距，因此两者不会互相压住。",
            })}
          </Text>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "A blur per group rather than one across the row: a row with filters at the start and a prompt at the end leaves the page between them sharp, the way the header's own groups leave the middle of the page alone. Inside HeaderFooterLayout every group's blur is painted on the page's Blur plane — the one plane that shell keeps under every floating control — so the header's groups never blur this row and this row never blurs them. Anywhere else, this page included, there is no plane and each blur paints beside its group, under the group's own controls.",
              zh: "每个控件组各有一片虚化，而非整行一片：筛选控件在行首、提示框在行尾的一行，两者之间的页面保持清晰，正如页头自身的控件组不会触及页面中部。在 HeaderFooterLayout 内，每组的虚化都绘制在页面的虚化平面上——该骨架在全部悬浮控件之下保留的那一层——因此页头的控件组不会虚化这一行，这一行也不会虚化它们。在其他地方（包括本页）没有虚化平面，每片虚化便绘制在各自控件组旁边，位于该组控件之下。",
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
        </div>
      </Showcase>

      <UsageSnippet code={usage} />

      <PropsTable component="sticky-controls" />
      <PropsTable component="sticky-control-group" />

      <DoDont
        do={
          <code css={styles.code}>
            {
              "<StickyControls><StickyControlGroup>{filters}</StickyControlGroup></StickyControls>"
            }
          </code>
        }
        doCaption={t({
          en: "Park a filter bar with StickyControls, a group per cluster of controls — one clearance and one blur, shared with the header's own control groups.",
          zh: "用 StickyControls 停放筛选栏，每簇控件一个组——与页头自身的控件组共用同一段间距和同一套虚化。",
        })}
        dont={
          <code css={styles.code}>
            {"<div css={styles.stickyBar}>{filters}</div>"}
          </code>
        }
        dontCaption={t({
          en: "Don't hand-roll a sticky row with a fill of its own — a surface under the controls is the treatment the progressive blur replaces.",
          zh: "不要手写自带底色的粘性行——控件下的实底正是渐进虚化所取代的做法。",
        })}
      />
    </>
  );
}

const styles = stylex.create({
  // No `alignItems`: the specimen takes the full width so its code panel does
  // too, matching the Progressive blur and Scroll mask pages.
  stack: {
    gap: space._3,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    overflowWrap: "anywhere",
  },
});
