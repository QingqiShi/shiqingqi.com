import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { popoverSurface } from "@tuja/ui/components/popover-surface.stylex";
import { ProgressiveBlur } from "@tuja/ui/components/progressive-blur";
import { Text } from "@tuja/ui/components/text";
import type { PopoverPlacement } from "@tuja/ui/hooks/use-popover";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import { border, color, font, space } from "@tuja/ui/tokens.stylex";
import { t } from "#src/i18n.ts";
import { DoDont } from "../../do-dont.tsx";
import { guidelineDiagram } from "../../guideline-diagram.stylex.ts";
import { PropsTable } from "../../props-table.tsx";
import { ShowcaseHelper } from "../../showcase-helper.tsx";
import { Showcase } from "../../showcase.tsx";
import { Specimen } from "../../specimen.tsx";
import { WireframeBar } from "../../specimens/wireframe-bar.tsx";
import {
  AnchoredPanelDemo,
  DismissalDemo,
  FlipDemo,
  HintDemo,
  PlacementDemo,
  PortalTargetDemo,
  RailPopover,
  RepaymentSourcesDemo,
} from "./popover-specimens.tsx";

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
  return (
    <>
      <Showcase label={t({ en: "Trigger and panel", zh: "触发元素与面板" })}>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "A surface hung off a trigger. Click to open it; Escape, a pointer outside, or focus leaving all close it. It holds no focus trap and no scroll lock, so the page behind stays readable and usable the whole time.",
            zh: "挂在触发元素上的浮层。点击即可打开；按 Escape、在外部点击或让焦点离开都会关闭它。它不捕获焦点、不锁定滚动，因此后面的页面始终可读可用。",
          })}
        </Text>
        <Specimen caption={t({ en: "arbitrary content", zh: "任意内容" })}>
          <AnchoredPanelDemo />
        </Specimen>
      </Showcase>

      <Showcase label={t({ en: "Placement", zh: "位置" })}>
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
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
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: 'Flipping is the other half. This trigger asks for placement="top". Scroll the page until it sits near the top of the window and open it — with no room above, the side flips to the bottom instead.',
            zh: '翻转是另一半。这个触发元素请求 placement="top"。把页面滚动到它靠近窗口顶部时再打开——上方没有空间，那条边就会翻转到下方。',
          })}
        </Text>
        <Specimen caption={t({ en: "flipping", zh: "翻转" })}>
          <FlipDemo />
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
        <Text look="bodySmall" tone="muted" wrap="pretty" css={styles.note}>
          {t({
            en: "The panel is portalled so a clipping or transformed ancestor cannot cut it off, and document.body is the default because it is almost always the right answer. Pass an element to render it somewhere else — inside a native dialog, say — or null to hold rendering until a target exists.",
            zh: "面板通过 portal 渲染，这样带裁剪或变换的祖先元素就无法把它切掉；默认是 document.body，因为绝大多数情况下这就是正确答案。传入一个元素可以渲染到别处——例如原生 dialog 内部——或传入 null 以等待目标出现再渲染。",
          })}
        </Text>
        <Specimen caption={t({ en: "a chosen host", zh: "指定的宿主" })}>
          <PortalTargetDemo />
        </Specimen>
      </Showcase>

      <PropsTable component="popover" />
      <ShowcaseHelper>
        {t({
          en: "Every prop above is a thin pass-through to usePopover, the headless hook underneath — the Hooks page documents it. Reach for the hook when the popup has to be something other than this surface: a listbox, a tooltip, a panel of your own.",
          zh: "这里的每个属性都只是薄薄地转交给底层的无界面 hook usePopover——Hooks 页面有它的文档。当弹出内容需要是别的东西时（列表框、提示气泡、你自己的面板），直接用这个 hook。",
        })}
      </ShowcaseHelper>

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
          do={<RepaymentSourcesDemo />}
          doCaption={t({
            en: "Put structured or interactive content in it. The panel takes focus, is announced as a dialog, and Tab reaches everything inside — all of which earn their cost.",
            zh: "把结构化或可交互的内容放进去。面板会取得焦点、以对话框身份被宣读，Tab 也能走到内部每个元素——在这里这些代价都值得。",
          })}
          dont={<HintDemo />}
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
  note: {
    maxInlineSize: "65ch",
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
