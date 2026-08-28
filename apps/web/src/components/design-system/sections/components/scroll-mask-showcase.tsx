import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { ScrollMask } from "@tuja/ui/components/scroll-mask";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { scrollX, scrollbar } from "@tuja/ui/primitives/layout.stylex";
import { transition } from "@tuja/ui/primitives/motion.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { WireframeBar } from "../../specimens/wireframe-bar.tsx";

export function ScrollMaskShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Scroll mask", zh: "滚动虚化" })}>
        <div css={[flex.col, styles.stack]}>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "A band against each edge of the region, holding still while the content moves under it. Each band is a stack of layers blurring whatever passes beneath — strongest against the edge, back to sharp one depth in — so content leaves the region by blurring out rather than by being cut at a line. An edge carries a band only while there is scrolled-away content past it, and the band melts its radius in and out rather than its opacity. The bands are aria-hidden and ignore pointer events, so scrolling, selecting and clicking pass straight through them.",
              zh: "区域的每条边上都有一条虚化带，内容在其下方移动，虚化带本身不动。每条虚化带由多层虚化叠加而成——紧贴边缘处最强，向内一个深度后回到清晰——因此内容是虚化着离开区域，而不是被一条线切断。只有当某条边之外还有已滚过的内容时，该边才带虚化带；虚化带的显隐靠半径平滑变化，而非透明度。虚化带对无障碍隐藏且不响应指针事件，滚动、选取与点击都会直接穿透。",
            })}
          </Text>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "It renders as a root that holds the region's place in the layout and a scroller inside it that owns the overflow, so css and contentCss each reach one of them. The ref and any native div attributes land on the scroller, which is what lets a consumer name the region, measure it, or scroll it imperatively while the region keeps its bands.",
              zh: "组件渲染为两层：外层根元素在布局中占位，内层滚动元素负责溢出滚动，因此 css 与 contentCss 各自作用于其中一层。ref 与原生 div 属性都落在滚动元素上，调用方由此可以为区域命名、测量它或以编程方式滚动它，而虚化带仍由组件自己维护。",
            })}
          </Text>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "startChrome and endChrome pin non-content furniture over an edge — a header row, a pinned action bar. Every band is a sibling of the scroller, against the region's own edge; on a slotted edge it grows to the chrome's measured box plus depth, so scrolled-away content blurs progressively across the whole chrome — strongest at the outer edge, back to sharp one depth past the inner one — while the chrome paints above the band and stays crisp and interactive. The content between the slots grows to fill the region, so end chrome stays pinned to the edge even while the content is too short to scroll.",
              zh: "startChrome 与 endChrome 插槽将页眉行、固定操作栏这类非内容界面元素固定在区域边缘上。每条虚化带都是滚动元素的同级元素，紧贴区域自身的边缘；带插槽的那条边，虚化带会扩展到该元素实测的盒子加一个深度，因此已滚过的内容会在整个元素的范围内渐进虚化——外缘最强，越过内缘一个深度后恢复清晰——而元素绘制在虚化带之上，保持清晰且可交互。插槽之间的内容会撑满区域，所以即使内容不足以滚动，endChrome 也始终固定在边缘。",
            })}
          </Text>
          <Specimen caption={t({ en: "vertical", zh: "纵向" })}>
            <VerticalRegion />
          </Specimen>
          <Specimen caption={t({ en: "horizontal", zh: "横向" })}>
            <HorizontalRegion />
          </Specimen>
          <Specimen
            caption={t({
              en: "under a pinned action bar",
              zh: "固定操作栏之下",
            })}
          >
            <PinnedBarRegion />
          </Specimen>
          <Specimen caption={t({ en: "content that fits", zh: "内容放得下" })}>
            <FittingRegion />
          </Specimen>
        </div>
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "children",
              type: "ReactNode",
              required: true,
              description: t({
                en: "The region's content. It renders inside the scroller, which owns the overflow and moves under the bands.",
                zh: "区域的内容。它渲染在滚动元素内部，由滚动元素负责溢出滚动，并在虚化带下方移动。",
              }),
            },
            {
              name: "orientation",
              type: '"vertical" | "horizontal"',
              defaultValue: '"vertical"',
              description: t({
                en: "Which axis scrolls. Vertical masks the block-start and block-end edges; horizontal masks the inline-start and inline-end edges.",
                zh: "滚动的轴向。纵向虚化块起始与块结束两条边，横向虚化行起始与行结束两条边。",
              }),
            },
            {
              name: "radius",
              type: "number",
              defaultValue: "8",
              description: t({
                en: "Nominal blur radius in px against the edge, where the mask is strongest — the stacked layers compound to slightly above it. Clamped to the cap (32).",
                zh: "紧贴边缘（虚化最强处）的名义虚化半径（像素）——叠加的图层会让实际强度略高于该值。会被限制在上限（32）以内。",
              }),
            },
            {
              name: "depth",
              type: "string",
              defaultValue: '"1.5rem"',
              description: t({
                en: "How far the mask reaches from the edge into the region. Any CSS length — deeper for a region whose content is large, shallower for a dense one.",
                zh: "虚化从边缘向区域内部延伸的距离。可用任意 CSS 长度——内容尺寸大的区域用更深的值，紧凑的区域用更浅的值。",
              }),
            },
            {
              name: "startChrome",
              type: "ReactNode",
              description: t({
                en: "Chrome pinned over the start edge — a header row the content scrolls beneath. The slot rides inside the scroller, stuck to the scrollport's start, while that edge's band stays beside the scroller and grows to the chrome's measured box plus depth: content blurs out across the chrome's whole box, and the chrome paints above the band and stays sharp and interactive.",
                zh: "固定在起始边上的界面元素——内容从其下方滚过的页眉行。该插槽位于滚动元素内部、吸附在滚动口的起始边；这条边的虚化带仍在滚动元素之侧，并扩展到该元素实测的盒子加一个深度：内容在整个元素的盒子上虚化淡出，而元素绘制在虚化带之上，保持清晰且可交互。",
              }),
            },
            {
              name: "endChrome",
              type: "ReactNode",
              description: t({
                en: "Chrome pinned over the end edge — a pinned footer or action bar. The mirror of startChrome; the content between the slots grows to fill the region, so end chrome stays pinned to the edge even while the content is too short to scroll.",
                zh: "固定在结束边上的界面元素——固定页脚或操作栏。与 startChrome 互为镜像；插槽之间的内容会撑满区域，因此即使内容不足以滚动，endChrome 也始终固定在边缘。",
              }),
            },
            {
              name: "showStartMask",
              type: "boolean",
              description: t({
                en: "Controlled state for the start edge. Pass it together with showEndMask and the region renders the bands from them instead of tracking its own scroll position — for a consumer already running useScrollMask on the same element to drive sibling chrome, such as scroll-to-page buttons.",
                zh: "起始边的受控状态。与 showEndMask 一同传入时，区域将按这两个值渲染虚化带，不再自行跟踪滚动位置——适用于已在同一元素上运行 useScrollMask 来驱动相邻控件（例如翻页按钮）的调用方。",
              }),
            },
            {
              name: "showEndMask",
              type: "boolean",
              description: t({
                en: "Controlled state for the end edge. Omit both it and showStartMask — the default — and the region tracks the scroll position itself, remeasuring on scroll, on resize, and when its children change.",
                zh: "结束边的受控状态。与 showStartMask 一同省略（默认情形）时，区域会自行跟踪滚动位置，并在滚动、尺寸变化以及子元素变化时重新测量。",
              }),
            },
            {
              name: "css",
              type: "StyleProp",
              description: t({
                en: "StyleX styles merged over the root's own — the escape hatch for how the region sits in the layout around it: flex or grid sizing, block size, margin, and the region's corners. The root is the box the bands are positioned against, so it owns both the outer size and the radius: the scroller rounds its own overflow clip to those corners and the bands take them by inheritance. So nothing above the bands may clip — not the root, and not a rounded ancestor of it.",
                zh: "与根元素自身样式合并的 StyleX 样式——用于控制区域在周围布局中的位置：flex 或 grid 尺寸、块尺寸、外边距，以及区域的圆角。虚化带以根元素为定位基准，因此外部尺寸归这里，圆角同样归这里：滚动元素据这组圆角裁切自身的溢出，虚化带则继承取用。因此虚化带之上不得有任何 overflow 裁切——根元素不行，它带圆角的祖先也不行。",
              }),
            },
            {
              name: "contentCss",
              type: "StyleProp",
              description: t({
                en: "StyleX styles merged over the scroller's own — the escape hatch for what is inside: padding, the layout of the children, scroll manners, scrollbar treatment. The scroller is also where the ref and the native attributes land, so a focus ring belongs on it too — drawn at the root's corners, which the scroller takes over these styles, so a radius among them does not survive. With a chrome slot, scroll-axis padding belongs inside the slots and the children rather than on the scroller, where it would unpin the chrome from the edge.",
                zh: "与滚动元素自身样式合并的 StyleX 样式——用于控制内部：内边距、子元素布局、滚动行为与滚动条样式。ref 与原生属性同样落在滚动元素上，因此聚焦环也归这里——但聚焦环沿用根元素的圆角：滚动元素的圆角覆盖在这组样式之上，在这里设置的圆角不会生效。使用插槽时，滚动轴方向的内边距应放在插槽与子元素内部，而不是滚动元素上——否则插槽会脱离边缘。",
              }),
            },
          ]}
        />
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={<MaskedGuidelineDiagram />}
          doCaption={t({
            en: "Blur the content on its way out of view, so the region reads as continuing past its edge.",
            zh: "让内容在移出视野时虚化，使区域读起来在边缘之外仍有延续。",
          })}
          dont={<ClippedGuidelineDiagram />}
          dontCaption={t({
            en: "Don't let the content stop at a line — a hard edge reads as the end of what there is, and nothing invites a visitor to scroll on.",
            zh: "不要让内容在一条线上戛然而止——生硬的边缘读起来就是内容的尽头，没有任何东西邀请访客继续滚动。",
          })}
        />
      </Showcase>
    </>
  );
}

/** A bounded region of prose, taller than its box, masking both edges as it scrolls. */
function VerticalRegion() {
  return (
    <ScrollMask
      css={[corner.radius_3, styles.region]}
      contentCss={[
        styles.regionContent,
        scrollbar.autoHide,
        transition.scrollbarColor,
      ]}
    >
      <Text variant="bodySmall">
        {t({
          en: "Thirty years on, a new blade runner turns up a secret buried deep enough to unsettle what is left of the city.",
          zh: "三十年后，一名新的银翼杀手翻出了一个埋得足够深的秘密，足以动摇这座城市仅存的秩序。",
        })}
      </Text>
      <Text variant="bodySmall">
        {t({
          en: "The trail leads to a former blade runner who dropped out of sight three decades ago and has been off the record ever since.",
          zh: "线索指向一名三十年前销声匿迹的前银翼杀手，此后再无任何记录。",
        })}
      </Text>
      <Text variant="bodySmall">
        {t({
          en: "Every answer costs him something he was sure of when he started.",
          zh: "每找到一个答案，他出发时确信的东西就少一样。",
        })}
      </Text>
      <Text variant="bodySmall">
        {t({
          en: "The rain does not stop, the archives are gone, and nobody who knew the truth is still on the payroll.",
          zh: "雨一直没停，档案已经烧毁，知道真相的人也都不在名册上了。",
        })}
      </Text>
      <Text variant="bodySmall" tone="muted">
        {t({
          en: "What he decides to do with it is the one part no file records.",
          zh: "他最终如何处置这个秘密，是唯一没有记录在案的部分。",
        })}
      </Text>
    </ScrollMask>
  );
}

/**
 * A row wider than its box. It takes the native attributes ScrollMask forwards
 * to the scroller — a name for the region and a tab stop — so the row can be
 * scrolled from the keyboard, and pairs them with the focus ring on the
 * scroller where the tab stop is.
 */
function HorizontalRegion() {
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
  ];

  return (
    <ScrollMask
      orientation="horizontal"
      role="group"
      aria-label={t({ en: "Films by this director", zh: "该导演的影片" })}
      tabIndex={0}
      css={[corner.radius_3, styles.rowRegion]}
      contentCss={[scrollX.focusRing, styles.rowContent]}
    >
      {films.map((film) => (
        <div key={film.title} css={[corner.radius_2, styles.rowItem]}>
          <Text variant="bodySmall" weight="semibold">
            {film.title}
          </Text>
          <Text variant="caption" tone="muted">
            {film.year}
          </Text>
        </div>
      ))}
    </ScrollMask>
  );
}

/**
 * The composition `SidebarLayout` uses for its rail: the action bar rides in
 * the `endChrome` slot, so the content bleeds under it to the region's own
 * edge and blurs out across the bar's whole height — the bar needs no surface
 * of its own, because the blur is what separates it.
 */
function PinnedBarRegion() {
  return (
    <ScrollMask
      css={[corner.radius_3, styles.barRegion]}
      contentCss={[scrollbar.autoHide, transition.scrollbarColor]}
      endChrome={
        <div css={styles.pinnedBar}>
          <Button variant="primary" size="sm">
            {t({ en: "Save changes", zh: "保存更改" })}
          </Button>
        </div>
      }
    >
      <div css={styles.regionContent}>
        <Text variant="bodySmall">
          {t({
            en: "Notification settings control which alerts reach this device, and how urgently they arrive.",
            zh: "通知设置决定哪些提醒会推送到此设备，以及推送的紧急程度。",
          })}
        </Text>
        <Text variant="bodySmall">
          {t({
            en: "Turning one off doesn't change what you still receive by email.",
            zh: "在这里关闭某一项，不会影响你仍会通过邮件收到的提醒。",
          })}
        </Text>
        <Text variant="bodySmall">
          {t({
            en: "Alerts marked urgent still ring during quiet hours, on every device signed in to this account.",
            zh: "标记为紧急的提醒在免打扰时段仍会响铃，且会在登录此账户的每台设备上响铃。",
          })}
        </Text>
        <Text variant="bodySmall">
          {t({
            en: "A change applies from the next alert onwards; anything already sent stays as it was.",
            zh: "此处的修改从下一条提醒开始生效；已经发出的提醒不受影响。",
          })}
        </Text>
        <Text variant="bodySmall">
          {t({
            en: "Quiet hours pause everything except account security alerts.",
            zh: "免打扰时段会暂停除账户安全提醒之外的所有通知。",
          })}
        </Text>
        <Text variant="bodySmall" tone="muted">
          {t({
            en: "Sign out of a device to stop it receiving anything at all.",
            zh: "退出某台设备的登录，即可让它完全不再收到任何提醒。",
          })}
        </Text>
      </div>
    </ScrollMask>
  );
}

/** The same region with content short enough to fit, so neither edge masks. */
function FittingRegion() {
  return (
    <ScrollMask
      css={[corner.radius_3, styles.region]}
      contentCss={styles.regionContent}
    >
      <Text variant="bodySmall">
        {t({
          en: "Denis Villeneuve, 2017. Roger Deakins shot it, and won for it.",
          zh: "丹尼斯·维伦纽瓦，2017 年。罗杰·迪金斯掌镜，并凭此获奖。",
        })}
      </Text>
      <Text variant="bodySmall" tone="muted">
        {t({
          en: "163 minutes, and none of them hurried.",
          zh: "163 分钟，没有一分钟是赶出来的。",
        })}
      </Text>
    </ScrollMask>
  );
}

/** The rows both guideline diagrams stage — more than the frame holds, by design. */
function GuidelineDiagramRows() {
  return (
    <>
      <WireframeBar width="72%" />
      <WireframeBar width="48%" />
      <WireframeBar width="60%" />
      <WireframeBar width="66%" />
      <WireframeBar width="40%" />
      <WireframeBar width="70%" />
      <WireframeBar width="52%" />
      <WireframeBar width="64%" />
      <WireframeBar width="46%" />
    </>
  );
}

/** A miniature region using the real `ScrollMask`, at a radius scaled to it. */
function MaskedGuidelineDiagram() {
  return (
    <ScrollMask
      radius={6}
      css={[corner.radius_2, styles.diagramRegion]}
      contentCss={styles.diagramContent}
    >
      <GuidelineDiagramRows />
    </ScrollMask>
  );
}

/** The same rows clipped by overflow alone — the treatment a Scroll mask replaces. */
function ClippedGuidelineDiagram() {
  return (
    <div css={[corner.radius_2, styles.diagramRegion, styles.diagramClip]}>
      <div css={styles.diagramContent}>
        <GuidelineDiagramRows />
      </div>
    </div>
  );
}

const styles = stylex.create({
  // No `alignItems`: each specimen takes the full width so its code panel does
  // too, matching the Progressive blur page's own stack.
  stack: {
    gap: space._3,
  },
  // The bands are positioned against the root, so the root is what carries the
  // region's chrome — its corners included, which the bands and the scroller
  // take from it. The root must never clip: Chrome drops a mask under a
  // squircle-cornered clip, and every band flattens into one hard-edged blur.
  // One size for both prose specimens, so the only difference a reader sees
  // between them is how much content the box was given.
  region: {
    inlineSize: "100%",
    blockSize: "9rem",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  regionContent: {
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    padding: space._3,
  },
  rowRegion: {
    inlineSize: "100%",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  rowContent: {
    display: "flex",
    gap: space._2,
    padding: space._3,
  },
  rowItem: {
    display: "flex",
    flexDirection: "column",
    gap: space._00,
    flexShrink: 0,
    inlineSize: "9.5rem",
    paddingBlock: space._2,
    paddingInline: space._2,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  // The ScrollMask root is the frame here rather than sitting inside one: a
  // clipping squircle above the bands is what flattens them. The root lays out
  // as a grid that has given up its automatic minimum size, so a fixed
  // `blockSize` bounds it the way it bounds `region`, and the bar rides in the
  // `endChrome` slot instead of below the region.
  barRegion: {
    inlineSize: "100%",
    blockSize: "14rem",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  // No border and no background: the bar sits directly on the blurred
  // content, and the blur is what separates it from the region.
  pinnedBar: {
    display: "flex",
    justifyContent: "flex-end",
    paddingBlock: space._2,
    paddingInline: space._3,
  },
  // Shared by both diagrams, and unclipped: the masked one is a real
  // ScrollMask, whose bands a squircle clip above them would flatten.
  diagramRegion: {
    inlineSize: "100%",
    blockSize: space._10,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  // The "don't" diagram's whole subject: rows cut at a line by overflow alone.
  diagramClip: {
    overflow: "hidden",
  },
  // Grid, not a flex column: the masked diagram's scroller has a definite
  // height, and flex would shrink these empty rows — whose min-content height
  // is zero — until nothing was left to blur. Grid rows keep their own size and
  // overrun the box, which is what both diagrams are here to show.
  diagramContent: {
    display: "grid",
    alignContent: "start",
    gap: space._0,
    padding: space._2,
  },
});
