"use client";

import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { Popover } from "@tuja/ui/components/popover";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { Text } from "@tuja/ui/components/text";
import type { PopoverPlacement } from "@tuja/ui/hooks/use-popover";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { flex } from "@tuja/ui/primitives/flex.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { guidelineDiagram } from "../../guideline-diagram.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase, StateReadout } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { WireframeBar } from "../../specimens/wireframe-bar.tsx";

// Grouped by side, three to a row, so the grid reads as four sides × three
// alignments rather than twelve unrelated values.
const PLACEMENTS = [
  "top-start",
  "top",
  "top-end",
  "right-start",
  "right",
  "right-end",
  "bottom-start",
  "bottom",
  "bottom-end",
  "left-start",
  "left",
  "left-end",
] satisfies PopoverPlacement[];

/** One trigger per placement; the trigger's label is the value it passes. */
function PlacementDemo({ placement }: { placement: PopoverPlacement }) {
  return (
    <Popover
      placement={placement}
      trigger={(triggerProps) => (
        <Button {...triggerProps} size="sm" variant="outline">
          {placement}
        </Button>
      )}
    >
      <span css={styles.placementPanel}>{placement}</span>
    </Popover>
  );
}

/** Wider than its trigger, so near a window edge the panel has to shift back. */
function RailPopover({ label }: { label: string }) {
  return (
    <Popover
      placement="bottom"
      trigger={(triggerProps) => (
        <Button {...triggerProps} size="sm">
          {label}
        </Button>
      )}
    >
      <Text variant="bodySmall" tone="muted" css={styles.railPanel}>
        {t({
          en: "This panel is wider than the trigger it hangs off, so against a window edge it slides back inside rather than running off screen.",
          zh: "这个面板比它挂靠的触发元素更宽，因此贴到窗口边缘时会滑回屏幕内，而不会跑出屏幕之外。",
        })}
      </Text>
    </Popover>
  );
}

function DismissalDemo() {
  const [open, setOpen] = useState(false);
  // Hoisted out of the render prop: `t()` has to be called in render scope.
  const triggerLabel = t({ en: "Open the panel", zh: "打开面板" });
  return (
    <div css={[flex.row, styles.demoRow]}>
      <Popover
        open={open}
        onOpenChange={setOpen}
        trigger={(triggerProps) => (
          <Button {...triggerProps} variant="primary">
            {triggerLabel}
          </Button>
        )}
      >
        <div css={[flex.col, styles.panel]}>
          <Text variant="bodySmall">
            {t({
              en: "Tab through these two controls, then once more — focus leaves the panel instead of cycling back to the first.",
              zh: "用 Tab 走过这两个控件，再按一次——焦点会离开面板，而不会绕回第一个。",
            })}
          </Text>
          <div css={[flex.row, styles.panelActions]}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
            >
              {t({ en: "Close", zh: "关闭" })}
            </Button>
            <Button size="sm" variant="ghost">
              {t({ en: "Second control", zh: "第二个控件" })}
            </Button>
          </div>
        </div>
      </Popover>
      <Button variant="ghost">
        {t({ en: "Somewhere else", zh: "其他位置" })}
      </Button>
      <StateReadout label="onOpenChange →">
        {open ? "true" : "false"}
      </StateReadout>
    </div>
  );
}

function PortalTargetDemo() {
  // A ref alone would not re-render, and the popover needs the element as a
  // prop. Until it arrives the target is `null`, which holds the panel back.
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const triggerLabel = t({
    en: "Open into the box below",
    zh: "渲染到下方方框中",
  });
  return (
    <div css={[flex.col, styles.stack]}>
      <Popover
        portalTarget={host}
        trigger={(triggerProps) => (
          <Button {...triggerProps}>{triggerLabel}</Button>
        )}
      >
        <Text variant="bodySmall" tone="muted" css={styles.railPanel}>
          {t({
            en: "In the DOM this panel is a child of the dashed box. On screen it is still placed against the viewport, which is why nothing about it looks different.",
            zh: "在 DOM 中，这个面板是虚线方框的子节点。在屏幕上它依然相对视口定位，所以外观没有任何变化。",
          })}
        </Text>
      </Popover>
      <div ref={setHost} css={[corner.radius_2, styles.portalHost]}>
        <span css={styles.code}>portalTarget</span>
      </div>
    </div>
  );
}

/**
 * A miniature of a popover over a page. The real component portals to a
 * viewport-fixed layer, which a guideline panel cannot host — but the panel
 * wears the component's own `popoverSurface` skin, so only the placement here
 * is drawn by hand.
 */
function PopoverDiagram() {
  return (
    <div css={[corner.radius_2, guidelineDiagram.frame]}>
      <div css={[corner.radius_1, styles.diagramTrigger]} />
      <WireframeBar width="72%" />
      <WireframeBar width="48%" />
      <div css={[popoverSurface.base, styles.diagramPanel]}>
        <WireframeBar width="55%" strong />
        <WireframeBar width="80%" />
      </div>
    </div>
  );
}

/** The same page under a modal: blurred, and the panel centred rather than hung. */
function ModalDiagram() {
  return (
    <div css={[corner.radius_2, guidelineDiagram.frame]}>
      <div css={[corner.radius_1, styles.diagramTrigger]} />
      <WireframeBar width="72%" />
      <WireframeBar width="48%" />
      <ProgressiveBlur radius={10}>
        <div css={[popoverSurface.base, styles.diagramModal]}>
          <WireframeBar width="55%" strong />
          <WireframeBar width="80%" />
        </div>
      </ProgressiveBlur>
    </div>
  );
}

export function PopoverShowcase() {
  // Trigger labels live here rather than inside each `trigger` render prop,
  // which is a callback and so outside render scope.
  const anchoredLabel = t({ en: "Anchored panel", zh: "锚定面板" });
  const prefersTopLabel = t({ en: "Prefers the top", zh: "偏好上方" });
  const sourcesLabel = t({ en: "Repayment sources", zh: "还款来源" });
  const hintLabel = t({ en: "What's this?", zh: "这是什么？" });
  return (
    <>
      <Showcase label={t({ en: "Trigger and panel", zh: "触发元素与面板" })}>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "A surface hung off a trigger. Click to open it; Escape, a pointer outside, or focus leaving all close it. It holds no focus trap and no scroll lock, so the page behind stays readable and usable the whole time.",
            zh: "挂在触发元素上的浮层。点击即可打开；按 Escape、在外部点击或让焦点离开都会关闭它。它不捕获焦点、不锁定滚动，因此后面的页面始终可读可用。",
          })}
        </Text>
        <Specimen caption={t({ en: "arbitrary content", zh: "任意内容" })}>
          <Popover
            trigger={(triggerProps) => (
              <Button {...triggerProps} variant="primary">
                {anchoredLabel}
              </Button>
            )}
          >
            <div css={[flex.col, styles.panel]}>
              <Text as="span" variant="bodySmall" weight="semibold">
                {t({ en: "Arbitrary content", zh: "任意内容" })}
              </Text>
              <Text variant="caption" tone="muted">
                {t({
                  en: "A popover is not a menu. Put prose, a field, or a small form in it — the component owns the surface, the placement, and the dismissal rules, and nothing else.",
                  zh: "浮层不是菜单。这里可以放文字、输入框或一个小表单——组件只负责浮层表面、位置和关闭规则，其余都交给你。",
                })}
              </Text>
            </div>
          </Popover>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Placement", zh: "位置" })}>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Four sides, each on its own or aligned to one of the anchor's edges — twelve values, defaulting to bottom-start. Alignment mirrors under RTL, so start follows the reading direction rather than the left edge.",
            zh: "四条边，每条可单独使用或对齐到锚点的某一侧边缘——共十二个取值，默认 bottom-start。在 RTL 下对齐会镜像，因此 start 跟随阅读方向，而不是固定在左边。",
          })}
        </Text>
        <Specimen caption={t({ en: "twelve values", zh: "十二个取值" })}>
          <div css={styles.placementGrid}>
            {PLACEMENTS.map((placement) => (
              <PlacementDemo key={placement} placement={placement} />
            ))}
          </div>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Viewport collisions", zh: "视口碰撞" })}>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "Placement is computed against the window, not the trigger's corner. Scroll this rail until a trigger sits near a window edge, then open it — the panel shifts back inside the 8px gutter it keeps from every edge. Leave it open and keep scrolling: it re-reads the anchor on every scroll and resize.",
            zh: "位置是相对窗口计算的，而不是相对触发元素的角落。把这条轨道滚动到某个触发元素靠近窗口边缘，然后打开它——面板会平移回它与每条边缘保持的 8px 间距之内。保持打开继续滚动：每次滚动和尺寸变化它都会重新读取锚点。",
          })}
        </Text>
        <Specimen caption={t({ en: "shifting", zh: "平移" })}>
          <div css={[corner.radius_2, styles.rail]}>
            <div css={styles.railTrack}>
              <RailPopover label={t({ en: "Start", zh: "起点" })} />
              <RailPopover label={t({ en: "Middle", zh: "中间" })} />
              <RailPopover label={t({ en: "End", zh: "终点" })} />
            </div>
          </div>
        </Specimen>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: 'Flipping is the other half. This trigger asks for placement="top". Scroll the page until it sits near the top of the window and open it — with no room above, the side flips to the bottom instead.',
            zh: '翻转是另一半。这个触发元素请求 placement="top"。把页面滚动到它靠近窗口顶部时再打开——上方没有空间，那条边就会翻转到下方。',
          })}
        </Text>
        <Specimen caption={t({ en: "flipping", zh: "翻转" })}>
          <Popover
            placement="top"
            trigger={(triggerProps) => (
              <Button {...triggerProps} variant="outline">
                {prefersTopLabel}
              </Button>
            )}
          >
            <Text variant="bodySmall" tone="muted" css={styles.railPanel}>
              {t({
                en: "A side only flips when the opposite one fits. When neither does, the panel stays on the side you asked for and shifts as far as the gutter allows.",
                zh: "只有当对面一侧放得下时，边才会翻转。若两侧都放不下，面板会留在你请求的一侧，并在间距允许的范围内尽量平移。",
              })}
            </Text>
          </Popover>
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Dismissal and focus", zh: "关闭与焦点" })}>
        <ul css={styles.rules}>
          <li>
            {t({
              en: "Opening moves focus to the first focusable element inside, or to the panel itself when it holds none.",
              zh: "打开时焦点移到内部第一个可聚焦元素；若内部没有，则移到面板本身。",
            })}
          </li>
          <li>
            {t({
              en: "Escape closes it and hands focus back to the trigger. The keystroke stops there, so an enclosing dialog does not close along with it.",
              zh: "Escape 关闭它并把焦点交还给触发元素。按键在此停止传播，外层对话框不会随之一起关闭。",
            })}
          </li>
          <li>
            {t({
              en: "A pointer landing anywhere outside the panel and its trigger closes it, as does focus moving out — by Tab, by a skip link, or by a script.",
              zh: "指针落在面板与触发元素之外的任何位置都会关闭它；焦点移出时同样如此——无论是 Tab、跳转链接还是脚本。",
            })}
          </li>
          <li>
            {t({
              en: "Tab past the last control leaves the panel. It never cycles back to the first: that is a focus trap, and only Overlay does it.",
              zh: "从最后一个控件继续按 Tab 会离开面板。它不会绕回第一个：那是焦点捕获，只有覆盖层才这么做。",
            })}
          </li>
        </ul>
        <Specimen caption={t({ en: "no focus trap", zh: "不捕获焦点" })}>
          <DismissalDemo />
        </Specimen>
        <ShowcaseHelper>
          {t({
            en: "The panel unmounts on close, so its contents remount on every open — lift any state that has to survive the round trip.",
            zh: "面板关闭时会卸载，因此每次打开内容都会重新挂载——需要跨越这一来回的状态请提升到外部。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Portal target", zh: "渲染目标" })}>
        <Text variant="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The panel is portalled so a clipping or transformed ancestor cannot cut it off, and document.body is the default because it is almost always the right answer. Pass an element to render it somewhere else — inside a native dialog, say — or null to hold rendering until a target exists.",
            zh: "面板通过 portal 渲染，这样带裁剪或变换的祖先元素就无法把它切掉；默认是 document.body，因为绝大多数情况下这就是正确答案。传入一个元素可以渲染到别处——例如原生 dialog 内部——或传入 null 以等待目标出现再渲染。",
          })}
        </Text>
        <Specimen caption={t({ en: "a chosen host", zh: "指定的宿主" })}>
          <PortalTargetDemo />
        </Specimen>
      </Showcase>

      <Showcase>
        <PropsTable
          rows={[
            {
              name: "trigger",
              type: "(props: PopoverTriggerProps) => ReactNode",
              required: true,
              description: t({
                en: "Renders the element that opens the popover. Spread the supplied props onto it — they carry the anchor ref, the open state, and the ARIA wiring.",
                zh: "渲染打开浮层的元素。把传入的属性展开到该元素上——它们带着锚点 ref、打开状态和 ARIA 连线。",
              }),
            },
            {
              name: "children",
              type: "ReactNode",
              required: true,
              description: t({
                en: "The panel's content. Anything at all — this is not a menu.",
                zh: "面板的内容。任何东西都可以——它不是菜单。",
              }),
            },
            {
              name: "open",
              type: "boolean",
              description: t({
                en: "Controlled open state. The type requires onOpenChange alongside it, because a controlled popover the parent never hears from can never close.",
                zh: "受控的打开状态。类型要求同时提供 onOpenChange，因为父组件收不到通知的受控浮层永远无法关闭。",
              }),
            },
            {
              name: "defaultOpen",
              type: "boolean",
              defaultValue: "false",
              description: t({
                en: "Initial state when uncontrolled; ignored once open is supplied.",
                zh: "非受控时的初始状态；一旦提供了 open 便被忽略。",
              }),
            },
            {
              name: "onOpenChange",
              type: "(open: boolean) => void",
              description: t({
                en: "Called with the next state on every open and every close, whatever caused it.",
                zh: "每次打开和关闭时以下一状态调用，无论由什么触发。",
              }),
            },
            {
              name: "placement",
              type: "PopoverPlacement",
              defaultValue: '"bottom-start"',
              description: t({
                en: 'Preferred side and alignment: "top", "right", "bottom" or "left", each also available as -start and -end. The side flips and both axes shift when the window would clip the panel.',
                zh: '偏好的边与对齐方式："top"、"right"、"bottom"、"left"，每个还有 -start 与 -end 两种形式。当窗口会裁切面板时，边会翻转，两个轴向都会平移。',
              }),
            },
            {
              name: "offset",
              type: "number",
              defaultValue: "8",
              description: t({
                en: "Gap between the trigger and the panel, in pixels.",
                zh: "触发元素与面板之间的间隙，单位为像素。",
              }),
            },
            {
              name: "portalTarget",
              type: "Element | DocumentFragment | null",
              defaultValue: "document.body",
              description: t({
                en: "Where the panel is portalled. Pass null to defer rendering until a target is available.",
                zh: "面板 portal 到哪里。传入 null 可延迟渲染，直到目标可用。",
              }),
            },
            {
              name: "aria-label",
              type: "string",
              description: t({
                en: "Names the panel. Omit it and the trigger names the panel instead, which is right whenever the trigger says what the panel is about.",
                zh: "为面板命名。省略时改由触发元素命名——只要触发元素说清了面板的内容，这就是对的。",
              }),
            },
            {
              name: "aria-labelledby",
              type: "string",
              description: t({
                en: "Id of a visible element that names the panel, instead of the trigger. Ignored when aria-label is set.",
                zh: "用来命名面板的可见元素 id，替代触发元素。设置了 aria-label 时会被忽略。",
              }),
            },
            {
              name: "css",
              type: "StyleXStyles",
              description: t({
                en: "StyleX styles merged over the panel's surface — the config-layer escape hatch.",
                zh: "合并到面板表面之上的 StyleX 样式——配置层的逃生舱。",
              }),
            },
            {
              name: "className",
              type: "string",
              description: t({
                en: "Escape-hatch class applied to the panel.",
                zh: "应用到面板上的逃生舱 class。",
              }),
            },
            {
              name: "style",
              type: "CSSProperties",
              description: t({
                en: "Inline style applied to the panel. Leave top and left alone — placement writes them.",
                zh: "应用到面板上的内联样式。不要碰 top 与 left——它们由定位逻辑写入。",
              }),
            },
            {
              name: "ref",
              type: "Ref<HTMLDivElement>",
              description: t({
                en: "Ref to the panel element, merged with the one placement needs.",
                zh: "指向面板元素的 ref，会与定位所需的 ref 合并。",
              }),
            },
          ]}
        />
        <ShowcaseHelper>
          {t({
            en: "Every prop above is a thin pass-through to usePopover, the headless hook underneath — the Hooks page documents it. Reach for the hook when the popup has to be something other than this surface: a listbox, a tooltip, a panel of your own.",
            zh: "这里的每个属性都只是薄薄地转交给底层的无界面 hook usePopover——Hooks 页面有它的文档。当弹出内容需要是别的东西时（列表框、提示气泡、你自己的面板），直接用这个 hook。",
          })}
        </ShowcaseHelper>
      </Showcase>

      <Showcase label={t({ en: "Guidelines", zh: "使用准则" })}>
        <DoDont
          do={<PopoverDiagram />}
          doCaption={t({
            en: "Use a Popover for supporting content the reader can walk away from. The page behind stays scrollable, clickable, and undimmed.",
            zh: "浮层适合放随时可以离开的补充内容。它后面的页面依然可滚动、可点击，也不会变暗。",
          })}
          dont={<ModalDiagram />}
          dontCaption={t({
            en: "Don't reach for one when the page has to stop. A decision that blocks everything else needs Overlay's blurred page, focus trap, and scroll lock — a Popover deliberately has none of the three.",
            zh: "当页面必须停下来时不要用它。会阻断其余一切的决定需要覆盖层的页面虚化、焦点捕获与滚动锁定——浮层刻意不提供这三者。",
          })}
        />
        <DoDont
          do={
            <Popover
              placement="bottom-start"
              trigger={(triggerProps) => (
                <Button {...triggerProps} size="sm">
                  {sourcesLabel}
                </Button>
              )}
            >
              <div css={[flex.col, styles.panel]}>
                <Text as="span" variant="bodySmall" weight="semibold">
                  {t({ en: "Two sources", zh: "两个来源" })}
                </Text>
                <Text variant="caption" tone="muted">
                  {t({
                    en: "Payroll deductions and the annual self-assessment return.",
                    zh: "工资代扣，以及每年的自评税申报。",
                  })}
                </Text>
              </div>
            </Popover>
          }
          doCaption={t({
            en: "Put structured or interactive content in it. The panel takes focus, is announced as a dialog, and Tab reaches everything inside — all of which earn their cost.",
            zh: "把结构化或可交互的内容放进去。面板会取得焦点、以对话框身份被宣读，Tab 也能走到内部每个元素——在这里这些代价都值得。",
          })}
          dont={
            <Popover
              placement="top"
              trigger={(triggerProps) => (
                <Button {...triggerProps} size="sm" variant="ghost">
                  {hintLabel}
                </Button>
              )}
            >
              <Text variant="caption" tone="muted">
                {t({ en: "Sorted newest first.", zh: "按最新排序。" })}
              </Text>
            </Popover>
          }
          dontCaption={t({
            en: "Don't use one as a tooltip. A hint that short should never steal focus or announce itself as a dialog — put it in the control's own accessible name instead.",
            zh: "不要把它当作提示气泡。这么短的提示不该抢走焦点，也不该以对话框身份自我宣读——把它写进控件自身的可访问名称里。",
          })}
        />
      </Showcase>
    </>
  );
}

const styles = stylex.create({
  stack: {
    inlineSize: "100%",
    gap: space._3,
    alignItems: "flex-start",
  },
  note: {
    maxInlineSize: "65ch",
  },
  demoRow: {
    inlineSize: "100%",
    flexWrap: "wrap",
    gap: space._3,
  },
  panel: {
    gap: space._1,
    maxInlineSize: "34ch",
  },
  panelActions: {
    gap: space._1,
  },
  placementGrid: {
    display: "grid",
    inlineSize: "100%",
    gridTemplateColumns: {
      default: "repeat(2, 1fr)",
      [breakpoints.md]: "repeat(3, 1fr)",
    },
    gap: space._2,
  },
  placementPanel: {
    display: "block",
    minInlineSize: space._12,
    textAlign: "center",
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textMuted,
  },
  railPanel: {
    maxInlineSize: "34ch",
  },
  // Wider than the doc column on purpose: the rail has to scroll before a
  // trigger can be pushed out to a window edge.
  rail: {
    inlineSize: "100%",
    overflowX: "auto",
    overscrollBehaviorX: "contain",
    padding: space._3,
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  railTrack: {
    display: "flex",
    justifyContent: "space-between",
    gap: space._3,
    inlineSize: "180%",
  },
  rules: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    margin: 0,
    maxInlineSize: "65ch",
    paddingInlineStart: space._4,
    fontSize: font.uiBodySmall,
    lineHeight: font.lineHeight_4,
    color: color.textMuted,
  },
  code: {
    fontFamily: font.familyMono,
    fontSize: font.uiCaption,
    color: color.textSubtle,
  },
  // Dashed, because the box is a destination rather than a surface — nothing
  // ever paints inside it where the reader can see.
  portalHost: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    inlineSize: "100%",
    minBlockSize: space._8,
    borderWidth: border.size_1,
    borderStyle: "dashed",
    borderColor: color.neutralBorder,
  },
  diagramTrigger: {
    inlineSize: space._9,
    blockSize: space._2,
    backgroundColor: color.bgInteractiveSelected,
  },
  diagramPanel: {
    position: "absolute",
    insetBlockStart: space._6,
    insetInlineStart: space._2,
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    inlineSize: "68%",
    paddingBlock: space._1,
    paddingInline: space._2,
  },
  diagramModal: {
    position: "absolute",
    insetBlockStart: "50%",
    insetInlineStart: "50%",
    transform: "translate(-50%, -50%)",
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    inlineSize: "72%",
    paddingBlock: space._1,
    paddingInline: space._2,
  },
});
