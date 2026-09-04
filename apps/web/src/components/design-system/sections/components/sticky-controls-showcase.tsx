"use client";

import { FunnelXIcon } from "@phosphor-icons/react/dist/ssr/FunnelX";
import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import {
  StickyControlGroup,
  StickyControls,
} from "@tuja/ui/components/sticky-controls";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, ratio, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { UsageSnippet } from "../../usage-snippet.tsx";

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
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "One row of page chrome — a filter bar — parked under the header strip while the page scrolls past it, with the page blurred around each group of its controls the whole time it holds there. It melts away as soon as the row scrolls back into the flow of the page. The clearance it parks at is the one the header's own control groups occupy, so the two never sit on top of each other.",
              zh: "一行页面控件——例如筛选栏——在页面从其下方滚过时停在页头下方，停住期间页面在其每个控件组周围渐进虚化。一旦这一行重新回到页面的文档流中，虚化随即消退。它停放的位置正是页头自身控件组所占的那段间距，因此两者不会互相压住。",
            })}
          </Text>
          <Text variant="bodySmall" tone="muted">
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

      <Showcase label="StickyControls" labelVariant="code">
        <PropsTable
          rows={[
            {
              name: "children",
              type: "ReactNode",
              required: true,
              description: t({
                en: "The row's groups — a StickyControlGroup per cluster of controls. Two clusters far enough apart show as two blurs with sharp page between them; anything outside a group is laid out in the row but never blurred.",
                zh: "行内的控件组——每一簇控件对应一个 StickyControlGroup。相距足够远的两簇各显示为一片虚化，中间的页面保持清晰；不在任何组内的内容会排在行中，但不会被虚化。",
              }),
            },
            {
              name: "css",
              type: "StyleProp",
              description: t({
                en: "StyleX styles merged over the sticky row's own — the escape hatch for where the row sits and where it parks: its measure, padding, margins, the breakpoint it shows at, and insetBlockStart for a row that parks somewhere other than under the header strip. The row is a flex row with a gap between its groups; a display override for a breakpoint has to say flex, not block.",
                zh: "与粘性行自身样式合并的 StyleX 样式——用于控制这一行的位置与停放点：版心、内边距、外边距、显示所在的断点，以及停放点不在页头下方时的 insetBlockStart。这一行是各组之间带间距的弹性行；按断点覆盖 display 时应写 flex，而不是 block。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label="StickyControlGroup" labelVariant="code">
        <PropsTable
          rows={[
            {
              name: "children",
              type: "ReactNode",
              required: true,
              description: t({
                en: "The controls in the group — a media type toggle, a sort picker, a reset. They sit directly on the blur, in a row, with no surface of their own.",
                zh: "组内的控件——媒体类型切换、排序选择、重置。它们直接排成一行置于虚化之上，自身不带任何底色。",
              }),
            },
            {
              name: "css",
              type: "StyleProp",
              description: t({
                en: "StyleX styles merged over the group's own — where the group sits in the row, such as marginInlineStart: auto for a group at the inline end. The group's own display, gap and alignment stay with the component.",
                zh: "与控件组自身样式合并的 StyleX 样式——用于控制该组在行中的位置，例如 marginInlineStart: auto 使其靠行尾。组自身的 display、间距与对齐仍归组件所有。",
              }),
            },
          ]}
        />
      </Showcase>

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

/**
 * The shape the movie database builds its filter bar in: a media type toggle
 * at the start and a reset at the end, over the list they filter, so the page
 * between the two groups shows sharp between their blurs. The row goes
 * straight onto the docs page — no shell of its own, because a shell inside
 * the one this page already runs in is the thing `HeaderFooterLayout` forbids.
 * The list is long enough to scroll, which is what gives the row a page to
 * hold over.
 */
function FilterBar() {
  const [mediaType, setMediaType] = useState<"movie" | "tv">("movie");
  const films = [
    {
      title: t({ en: "Blade Runner 2049", zh: "银翼杀手 2049" }),
      year: "2017",
    },
    { title: t({ en: "Arrival", zh: "降临" }), year: "2016" },
    { title: t({ en: "Dune", zh: "沙丘" }), year: "2021" },
    { title: t({ en: "Sicario", zh: "边境杀手" }), year: "2015" },
    { title: t({ en: "Prisoners", zh: "囚徒" }), year: "2013" },
    { title: t({ en: "Enemy", zh: "敌人" }), year: "2013" },
    { title: t({ en: "Incendies", zh: "焦土之城" }), year: "2010" },
    { title: t({ en: "Polytechnique", zh: "理工学院" }), year: "2009" },
    { title: t({ en: "Maelström", zh: "漩涡" }), year: "2000" },
  ];

  return (
    <>
      <StickyControls css={styles.bar}>
        <StickyControlGroup>
          <SegmentedControl
            aria-label={t({ en: "Media type", zh: "媒体类型" })}
            size="sm"
            value={mediaType}
            onChange={setMediaType}
            options={[
              { value: "movie", label: t({ en: "Movies", zh: "电影" }) },
              { value: "tv", label: t({ en: "TV", zh: "剧集" }) },
            ]}
          />
        </StickyControlGroup>
        <StickyControlGroup css={styles.trailing}>
          <Button
            size="sm"
            variant="ghost"
            aria-label={t({ en: "Reset filters", zh: "重置筛选" })}
            icon={<FunnelXIcon />}
          />
        </StickyControlGroup>
      </StickyControls>
      <div css={[flex.col, styles.list]}>
        {films.map((film) => (
          <div key={film.title} css={[corner.radius_2, styles.row]}>
            <div css={[corner.radius_1, styles.poster]} />
            <div css={flex.col}>
              <Text variant="bodySmall" weight="semibold">
                {film.title}
              </Text>
              <Text variant="caption" tone="muted">
                {film.year}
              </Text>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

const styles = stylex.create({
  // No `alignItems`: the specimen takes the full width so its code panel does
  // too, matching the Progressive blur and Scroll mask pages.
  stack: {
    gap: space._3,
  },
  // The row's measure and the gap under it belong to the consumer; the sticky
  // row only parks itself. Nothing here or above it clips: the blur's layers
  // are masked, and a squircle-cornered clip over them makes Chrome drop the
  // masks and render one flat blur.
  bar: {
    marginBlockEnd: space._3,
  },
  trailing: {
    marginInlineStart: "auto",
  },
  list: {
    gap: space._1,
  },
  row: {
    display: "flex",
    alignItems: "center",
    gap: space._3,
    padding: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  // Stand-in for the artwork a real row carries, at the ratio a poster takes.
  poster: {
    flexShrink: 0,
    inlineSize: space._8,
    aspectRatio: ratio.poster,
    backgroundColor: color.bgSurfaceSunken,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiBodySmall,
    color: color.textMain,
    overflowWrap: "anywhere",
  },
});
