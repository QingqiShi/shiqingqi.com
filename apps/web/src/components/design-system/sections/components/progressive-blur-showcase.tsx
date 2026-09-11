import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import type { ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { guidelineDiagram } from "../../guideline-diagram.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { WireframeBar } from "../../specimens/wireframe-bar.tsx";
import { BlurredDialogMock, MeltDemo } from "./progressive-blur-specimens.tsx";

export function ProgressiveBlurShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Progressive blur", zh: "渐进虚化" })}>
        <div css={[flex.col, styles.stack]}>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "A stack of blurred layers radiating from the floating element on every side, strongest against it and easing to sharp further out. The floating element is passed in, so the ramp runs out of its rect — measured, or reach in from the box's edges — and no callsite states a direction. Each layer is masked by a rounded rect around that element, so the field stays round the whole way out. Each also carries a share of a faint Wash of the page colour, so anything glaring behind the element is washed out rather than left at full contrast, and the Wash eases away with the blur. The layers are aria-hidden and ignore pointer events, so a dismissal click outside the element passes straight through to whatever sits behind it.",
              zh: "一组虚化图层从悬浮元素向四周辐射，紧贴元素处最强，越向外越清晰。悬浮元素作为子元素传入，坡度自它的矩形向外展开——或由测量得出，或由 reach 从虚化框边缘内推——因此调用处无需指定方向。每一层都由环绕该元素的圆角矩形遮罩，因此虚化范围由内到外始终是圆的。每一层还各自带有一份淡淡的页面底色淡彩，元素背后过于刺眼的内容会被冲淡，而不是保持原有的强对比，淡彩也随虚化一同向外淡出。这些图层对无障碍隐藏且不响应指针事件，元素之外的关闭点击会直接穿透到后方内容。",
            })}
          </Text>
          <Specimen caption={t({ en: "around a dialog", zh: "对话框周围" })}>
            <BlurredDialogMock />
          </Specimen>
          <Specimen caption={t({ en: "melt in and out", zh: "平滑显隐" })}>
            <MeltDemo />
          </Specimen>
          <Specimen caption={t({ en: "around a popup", zh: "弹层周围" })}>
            <BlurredPopupMock />
          </Specimen>
        </div>
      </Showcase>

      <PropsTable component="progressive-blur" />

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={<BlurGuidelineDiagram />}
          doCaption={t({
            en: "Blur the page around a floating element instead of dimming it. Brightness holds, and the element keeps a crisp edge against it.",
            zh: "在悬浮元素周围虚化页面，而不是压暗它。亮度得以保留，元素相对页面仍保持清晰的边缘。",
          })}
          dont={<ScrimGuidelineDiagram />}
          dontCaption={t({
            en: "Don't darken the page behind a floating element — the blur replaces the scrim, it does not join it.",
            zh: "不要在悬浮元素背后压暗页面——虚化取代遮罩，而非与之叠加。",
          })}
        />
      </Showcase>
    </>
  );
}

/**
 * A popup hanging off a trigger at the end of a bar — the static box `reach`
 * exists for. The blur's box is the popup plus 96px on every side: a fixed box
 * that follows the popup, so no rounded ancestor cuts it and it stays out of
 * the page's scrollable area.
 */
function BlurredPopupMock() {
  return (
    <div css={[corner.radius_3, styles.mockPage]}>
      <div css={[flex.between, styles.mockBar]}>
        <Text look="bodySmall" weight="semibold">
          {t({ en: "Watchlist", zh: "待看清单" })}
        </Text>
        <div css={styles.mockAnchor}>
          <Button size="sm">{t({ en: "Sort", zh: "排序" })}</Button>
          <div css={styles.mockPopupHang}>
            <ProgressiveBlur reach={96} radius={12}>
              <div css={[popoverSurface.base, styles.mockPopup]}>
                <Button size="sm" look="primary">
                  {t({ en: "Newest first", zh: "最新在前" })}
                </Button>
                <Button size="sm">
                  {t({ en: "Highest rated", zh: "评分最高" })}
                </Button>
                <Button size="sm">
                  {t({ en: "Title A to Z", zh: "按标题排序" })}
                </Button>
              </div>
            </ProgressiveBlur>
          </div>
        </div>
      </div>
      <div css={[flex.col, styles.mockPopupContent]}>
        <Text look="bodySmall">
          {t({
            en: "Forty-one titles are saved, and the six added this month sit at the top of the list until the sort changes.",
            zh: "共保存了四十一部作品，本月新增的六部会排在最前，直到排序方式改变为止。",
          })}
        </Text>
        <Text look="bodySmall">
          {t({
            en: "Two of them leave the service you watch them on at the end of next week.",
            zh: "其中两部将在下周末从你观看它们的服务上下架。",
          })}
        </Text>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Sorting changes this view only — the shared list keeps its own order.",
            zh: "排序只影响当前视图——共享清单保留自己的顺序。",
          })}
        </Text>
      </div>
    </div>
  );
}

/**
 * The page both guideline diagrams stage, wireframed by hand — as
 * `PopoverDiagram` and `ModalDiagram` do on the Popover page. Each caller
 * supplies only its own treatment of the panel below the content.
 *
 * `isClipped` is for the scrim, which covers the frame corner to corner and so
 * has to be cut to its corners. The blur diagram leaves it off — a
 * squircle-cornered clip above the layers makes Chrome drop their masks.
 */
function GuidelineDiagramFrame({
  children,
  isClipped,
}: {
  children: ReactNode;
  isClipped?: boolean;
}) {
  return (
    <div
      css={[
        corner.radius_2,
        guidelineDiagram.frame,
        isClipped && guidelineDiagram.clip,
      ]}
    >
      <WireframeBar width="72%" />
      <WireframeBar width="48%" />
      <WireframeBar width="60%" />
      {children}
    </div>
  );
}

/** The panel both diagrams float — real markup, since a wireframe bar can't show a raised surface. */
function GuidelineDiagramPanel() {
  return (
    <div css={[popoverSurface.base, styles.diagramPanel]}>
      <WireframeBar width="55%" strong />
      <WireframeBar width="80%" />
    </div>
  );
}

/**
 * A miniature of a floating panel over a page. The blur itself is the real
 * `ProgressiveBlur`, since that is the one part of the pair this page cannot fake.
 */
function BlurGuidelineDiagram() {
  return (
    <GuidelineDiagramFrame>
      <ProgressiveBlur radius={10}>
        <GuidelineDiagramPanel />
      </ProgressiveBlur>
    </GuidelineDiagramFrame>
  );
}

/** The same page darkened by a scrim instead — the pattern Progressive blur replaces. */
function ScrimGuidelineDiagram() {
  return (
    <GuidelineDiagramFrame isClipped>
      <div css={guidelineDiagram.scrim} />
      <GuidelineDiagramPanel />
    </GuidelineDiagramFrame>
  );
}

const styles = stylex.create({
  // No `alignItems`: the specimen takes the full width so its code panel does
  // too, matching the Overlay page's own stack.
  stack: {
    gap: space._3,
  },
  mockPage: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    // Tall enough for the ramp to read as a ramp — the blur runs from the
    // dialog out to the box's edge, so a short box spends the whole reach at
    // full strength and the demo looks like one flat blur — and no taller,
    // since page the ramp never reaches is page with nothing to show.
    minBlockSize: "24rem",
    padding: space._4,
    // No clip: the blur fills this box and takes its corners, and a
    // squircle-cornered clip above the layers makes Chrome drop their masks.
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  mockBar: {
    gap: space._3,
  },
  // The popup hangs from this cell, so it anchors to the trigger rather than
  // to the mock page.
  mockAnchor: {
    position: "relative",
  },
  // Over the trigger, not below it, which is where a real MenuButton opens.
  mockPopupHang: {
    position: "absolute",
    insetBlockStart: 0,
    insetInlineEnd: 0,
  },
  mockPopup: {
    display: "flex",
    flexDirection: "column",
    minInlineSize: "9rem",
    padding: space._1,
  },
  // Full width, unlike the dialog mock's column: the popup sits at the inline
  // end, and a blur over bare background has nothing to show.
  mockPopupContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: space._2,
  },
  diagramPanel: {
    position: "absolute",
    insetBlockEnd: space._2,
    insetInlineStart: space._2,
    insetInlineEnd: space._2,
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    paddingBlock: space._1,
    paddingInline: space._2,
  },
});
