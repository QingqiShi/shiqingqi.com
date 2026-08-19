"use client";

import * as stylex from "@stylexjs/stylex";
import { Button } from "@tuja/ui/components/button";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { Text } from "@tuja/ui/components/text";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, space } from "@tuja/ui/tokens.stylex";
import { useState, type ReactNode } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { guidelineDiagram } from "../../guideline-diagram.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { WireframeBar } from "../../specimens/wireframe-bar.tsx";

export function ProgressiveBlurShowcase() {
  return (
    <>
      <Showcase label={t({ en: "Progressive blur", zh: "渐进虚化" })}>
        <div css={[flex.col, styles.stack]}>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "A stack of blurred layers radiating from the floating element on every side, strongest against it and easing to sharp further out. The floating element is passed in, so the blur measures where it sits and no callsite states a direction. The strongest layer carries a faint wash of the page colour, so anything glaring behind the element is washed out rather than left at full contrast. The layers are aria-hidden and ignore pointer events, so a dismissal click outside the element passes straight through to whatever sits behind it.",
              zh: "一组虚化图层从悬浮元素向四周辐射，紧贴元素处最强，越向外越清晰。悬浮元素作为子元素传入，虚化会测量它的位置，因此调用处无需指定方向。最强的一层带有一抹淡淡的页面底色淡彩，元素背后过于刺眼的内容会被冲淡，而不是保持原有的强对比。这些图层对无障碍隐藏且不响应指针事件，元素之外的关闭点击会直接穿透到后方内容。",
            })}
          </Text>
          <Specimen caption={t({ en: "around a dialog", zh: "对话框周围" })}>
            <BlurredDialogMock />
          </Specimen>
          <Specimen caption={t({ en: "melt in and out", zh: "平滑显隐" })}>
            <MeltDemo />
          </Specimen>
        </div>
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "children",
              type: "ReactNode",
              description: t({
                en: "The floating element the blur radiates from. It is measured, so the ramp needs no direction; it renders above the layers and stays interactive while they let clicks through.",
                zh: "虚化向四周辐射所依据的悬浮元素。组件会测量它的位置，因此无需指定方向；它渲染在图层之上并保持可交互，而图层本身让点击穿透。",
              }),
            },
            {
              name: "radius",
              type: "number",
              defaultValue: "16",
              description: t({
                en: "Nominal blur radius in px at the strongest point, against the floating element; clamped to the cap (32).",
                zh: "最强处（紧贴悬浮元素处）的名义虚化半径（像素），会被限制在上限（32）以内。",
              }),
            },
            {
              name: "isShown",
              type: "boolean",
              defaultValue: "true",
              description: t({
                en: "Whether the blur is shown; toggling animates the radius away and back, so keep the element mounted while the exit plays.",
                zh: "是否显示虚化；切换时半径会平滑地消失或恢复，因此退场动画播放期间应保持元素挂载。",
              }),
            },
            {
              name: "css",
              type: "StyleProp",
              description: t({
                en: "StyleX styles merged over the component's own — the escape hatch for placement and plane (position, inset, z-index).",
                zh: "与组件自身样式合并的 StyleX 样式——用于控制位置与层级（position、inset、z-index）的逃生舱。",
              }),
            },
          ]}
        />
      </Showcase>

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
 * A bounded mock page with a centred dialog floating over it — the case the
 * measured ramp exists for. The blur radiates on all four sides and the page is
 * sharp again well before the mock page's own edges. Shared by both specimens,
 * so the melt demo toggles the same shape it introduces.
 */
function BlurredDialogMock({ isShown }: { isShown?: boolean }) {
  return (
    <div css={[corner.radius_3, styles.mockPage]}>
      <div css={[flex.col, styles.mockContent]}>
        <Text variant="bodySmall">
          {t({
            en: "This draft has three edits that haven't been saved to the shared copy yet.",
            zh: "这份草稿有三处修改尚未保存到共享副本。",
          })}
        </Text>
        <Text variant="bodySmall">
          {t({
            en: "Anyone opening the shared copy still sees the version from Tuesday.",
            zh: "打开共享副本的人看到的仍是周二的版本。",
          })}
        </Text>
        <Text variant="bodySmall" tone="muted">
          {t({
            en: "Autosave runs every five minutes while the editor stays open.",
            zh: "编辑器保持打开时，自动保存每五分钟运行一次。",
          })}
        </Text>
      </div>
      <ProgressiveBlur isShown={isShown}>
        <div css={[popoverSurface.base, styles.mockDialog]}>
          <Text variant="bodySmall" weight="semibold">
            {t({ en: "Discard three edits?", zh: "放弃三处修改？" })}
          </Text>
          <Text variant="bodySmall" tone="muted">
            {t({
              en: "The shared copy keeps Tuesday's version. This cannot be undone.",
              zh: "共享副本将保留周二的版本。此操作无法撤销。",
            })}
          </Text>
          <div css={[flex.row, styles.mockDialogActions]}>
            <Button size="sm">
              {t({ en: "Keep editing", zh: "继续编辑" })}
            </Button>
            <Button variant="primary" size="sm">
              {t({ en: "Discard edits", zh: "放弃修改" })}
            </Button>
          </div>
        </div>
      </ProgressiveBlur>
    </div>
  );
}

/** The consumer owns `isShown`, so a specimen has to own it too. */
function MeltDemo() {
  const [isShown, setIsShown] = useState(true);

  return (
    <div css={[flex.col, styles.meltStack]}>
      <BlurredDialogMock isShown={isShown} />
      <Button
        size="sm"
        css={styles.meltToggle}
        onClick={() => {
          setIsShown((shown) => !shown);
        }}
      >
        {isShown
          ? t({ en: "Hide blur", zh: "隐藏虚化" })
          : t({ en: "Show blur", zh: "显示虚化" })}
      </Button>
    </div>
  );
}

/**
 * The page both guideline diagrams stage, wireframed by hand — as
 * `PopoverDiagram` and `ModalDiagram` do on the Popover page. Each caller
 * supplies only its own treatment of the panel below the content.
 */
function GuidelineDiagramFrame({ children }: { children: ReactNode }) {
  return (
    <div css={[corner.radius_2, guidelineDiagram.frame]}>
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
    <GuidelineDiagramFrame>
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
    overflow: "hidden",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
  },
  // The copy runs the height of the mock rather than sitting in a block at the
  // top: the ramp is only visible where there is page under it, so a dialog
  // centred over a single block would show its blur above and nowhere else.
  mockContent: {
    flexGrow: 1,
    justifyContent: "space-between",
    gap: space._2,
    maxInlineSize: "17rem",
  },
  mockDialog: {
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineStart: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    gap: space._2,
    inlineSize: "min(22rem, 70%)",
    paddingBlock: space._3,
    paddingInline: space._3,
  },
  mockDialogActions: {
    justifyContent: "flex-end",
    gap: space._2,
  },
  meltStack: {
    gap: space._3,
  },
  meltToggle: {
    alignSelf: "flex-start",
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
