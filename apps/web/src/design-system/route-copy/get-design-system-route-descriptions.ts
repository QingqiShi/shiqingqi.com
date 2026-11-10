/**
 * The counterpart to `get-design-system-route-labels.ts`: that module names
 * each route, this one describes it in a sentence. The overview grid renders
 * every description as a tile blurb, and some foundation sections read a few
 * of them again for their own link cards, so a route reads the same way
 * wherever it is described.
 *
 * Server-only, and that is the whole design — see
 * `get-design-system-route-labels.ts` for why.
 */

import "server-only";
import { t } from "@tuja/i18n";
import type { DesignSystemPath } from "#src/design-system/routes/types.ts";

/**
 * One sentence about every registered route, in registry order. Total over
 * `DesignSystemPath`, so a route added to `../routes/design-system-routes.ts`
 * without a description here fails to compile.
 */
export function getDesignSystemRouteDescriptions(): Record<
  DesignSystemPath,
  string
> {
  return {
    "/design-system": t({
      en: "The design system overview and index.",
      zh: "设计系统概览与索引。",
    }),
    "/design-system/get-started": t({
      en: "What @tuja/ui is, how it is organised, and where to go for what you want.",
      zh: "@tuja/ui 是什么、如何组织，以及想要什么该去哪里。",
    }),
    "/design-system/patterns": t({
      en: "Whole screens built only from components: a dashboard, a settings page, a list and a form, ready to start from.",
      zh: "只用组件搭成的完整页面：仪表盘、设置页、列表和表单，可以直接拿来起步。",
    }),
    "/design-system/foundations/principles": t({
      en: "The ideas behind every decision in the system.",
      zh: "系统中每个决定背后的理念。",
    }),
    "/design-system/foundations/customization": t({
      en: "Every way to change a component, and what each leaves to you.",
      zh: "改变组件的每一种方式，以及每种方式留给你的部分。",
    }),
    "/design-system/foundations/color": t({
      en: "The colour token for each job, Intents, contrast and the palette.",
      zh: "每种用途的颜色令牌、意图色、对比度与调色板。",
    }),
    "/design-system/foundations/typography": t({
      en: "Text and Heading, font families, and the type roles for text you style yourself.",
      zh: "Text 与 Heading、字体族，以及你自己设置样式的文字所用的字体角色。",
    }),
    "/design-system/foundations/layout": t({
      en: "The space scale, control sizes, breakpoints, content width, layers and aspect ratios.",
      zh: "间距阶梯、控件尺寸、断点、内容宽度、层级与宽高比。",
    }),
    "/design-system/foundations/surfaces": t({
      en: "Card and popover skins, borders, corner radius, nested corners, shadows and floating surfaces.",
      zh: "卡片与弹出层外观、边框、圆角、嵌套圆角、阴影与悬浮表面。",
    }),
    "/design-system/foundations/material": t({
      en: "Texture, wash and glass, on top of colour and border.",
      zh: "在颜色与边框之上的纹理、淡彩与玻璃。",
    }),
    "/design-system/foundations/iconography": t({
      en: "Where the icons come from, how a slot takes one, how text sizes it, and the weight to match.",
      zh: "图标从哪里来、插槽如何接收图标、文字如何决定图标大小，以及相配的字重。",
    }),
    "/design-system/foundations/motion": t({
      en: "Transition presets, the spring and its roles, the motion engine, and reduced motion.",
      zh: "过渡预设、弹簧及其角色、动效引擎，以及减弱动效。",
    }),
    "/design-system/foundations/accessibility": t({
      en: "What the components guarantee, and the names and copy you supply.",
      zh: "组件的保障，以及你需要提供的名称与文案。",
    }),
    "/design-system/components/text": t({
      en: "The body-copy component: five type roles, three text colours, and four weights.",
      zh: "正文文字组件：五种字体角色、三种文字颜色与四种字重。",
    }),
    "/design-system/components/heading": t({
      en: "The heading primitive, with semantic level decoupled from visual size.",
      zh: "标题基础组件，语义层级与视觉字号相互独立。",
    }),
    "/design-system/components/code-block": t({
      en: "Source drawn as coloured runs, each part a box of its own, so a change slides, rises in, or fades where it stood.",
      zh: "以彩色片段绘制的源码，每个 part 各占一格，改动时会滑动、升起或原地淡出。",
    }),
    "/design-system/components/button": t({
      en: "An action or a destination, with looks, sizes and a press animation.",
      zh: "操作或目标链接，提供多种外观、尺寸与按压动画。",
    }),
    "/design-system/components/menu-button": t({
      en: "A button that expands into a popup menu, and the MenuItem rows inside it.",
      zh: "点击后展开为弹出菜单的按钮，以及菜单中的 MenuItem 行。",
    }),
    "/design-system/components/breadcrumb": t({
      en: "A trail of links back up the hierarchy, ending on the page you are reading.",
      zh: "沿层级向上回溯的链接路径，终点是当前所在页面。",
    }),
    "/design-system/components/pager": t({
      en: "The previous and next links at the end of a page in a sequence.",
      zh: "连续页面末尾的上一页与下一页链接。",
    }),
    "/design-system/components/nav-list": t({
      en: "The links between the pages of one place, in one column, with optional labelled groups.",
      zh: "同一处各页面之间的链接，排成一列，可分成带标签的组。",
    }),
    "/design-system/components/badge": t({
      en: "Compact status and label indicators in the six Intents plus a default, a status dot, and a line of facts to hold them.",
      zh: "六种意图色加默认样式的紧凑状态与标签指示器、状态圆点，以及容纳它们的事实行。",
    }),
    "/design-system/components/avatar": t({
      en: "A portrait or monogram medallion with an optional corner badge.",
      zh: "头像或字母缩写徽章，可附带角标。",
    }),
    "/design-system/components/table": t({
      en: "A semantic data table in its own scrolling region, with tabular figures and a sticky head.",
      zh: "位于独立滚动区域的语义化数据表格，支持等宽数字与粘性表头。",
    }),
    "/design-system/components/list": t({
      en: "Rows that each open something, on one surface with a divider between them.",
      zh: "每一行都能打开某个内容，所有行位于同一表面上，行间有分隔线。",
    }),
    "/design-system/components/callout": t({
      en: "An inline message box in six Intents for status and guidance.",
      zh: "六种意图色的行内消息框，用于状态与提示。",
    }),
    "/design-system/components/card": t({
      en: "A bordered surface container, static or interactive.",
      zh: "带描边的表面容器，支持静态或可交互两种形态。",
    }),
    "/design-system/components/section": t({
      en: "A labelled block of content with a quiet heading row.",
      zh: "带轻量标题行的内容区块。",
    }),
    "/design-system/components/disclosure": t({
      en: "An expand and collapse section, with a headless hook beneath it.",
      zh: "展开与折叠区块，底层提供无头 Hook。",
    }),
    "/design-system/components/spinner": t({
      en: "An indeterminate loading indicator that respects reduced motion.",
      zh: "尊重减弱动效偏好的不确定加载指示器。",
    }),
    "/design-system/components/progress": t({
      en: "A determinate bar for a wait whose length the page already knows.",
      zh: "用于页面已知时长的等待过程的确定型进度条。",
    }),
    "/design-system/components/skeleton": t({
      en: "Placeholder shapes that hold space while content loads.",
      zh: "在内容加载时占位的骨架形状。",
    }),
    "/design-system/components/toast": t({
      en: "A short message on Glass about what an action did, with an optional Undo.",
      zh: "玻璃质感上的一条短消息，告知某个操作的结果，可附带撤销。",
    }),
    "/design-system/components/divider": t({
      en: "Horizontal, vertical, and decorative separators.",
      zh: "水平、垂直与装饰性分隔线。",
    }),
    "/design-system/components/switch": t({
      en: "A draggable, three-state on/off/indeterminate toggle.",
      zh: "可拖动的开启／关闭／未定三态开关。",
    }),
    "/design-system/components/text-field": t({
      en: "A single-line input with label, description, and error states.",
      zh: "带标签、描述与错误态的单行输入框。",
    }),
    "/design-system/components/textarea": t({
      en: "A multi-line input with optional auto-grow.",
      zh: "支持自动增高的多行输入框。",
    }),
    "/design-system/components/checkbox": t({
      en: "A checkbox with label, indeterminate, and error states.",
      zh: "带标签、未定态与错误态的复选框。",
    }),
    "/design-system/components/segmented-control": t({
      en: "A single-select track for two to four views of the same content.",
      zh: "用于同一内容二至四种视图的单选轨道。",
    }),
    "/design-system/components/option-card": t({
      en: "The roomy form of a single choice, for options that need explaining.",
      zh: "单选的宽裕形态，适合需要说明的选项。",
    }),
    "/design-system/components/slider": t({
      en: "A range input with a live readout, streaming moves and a single commit.",
      zh: "带实时读数的范围输入，持续报告移动并在结束时提交一次。",
    }),
    "/design-system/components/page-header": t({
      en: "The top of a page: its title, what it is for, and its own actions.",
      zh: "页面的顶部：标题、页面用途，以及页面自身的操作。",
    }),
    "/design-system/components/stat": t({
      en: "The few key figures a page is about, in a row of cards or plain.",
      zh: "页面关注的几个关键数字，排成一行卡片或直接排列。",
    }),
    "/design-system/components/setting-row": t({
      en: "One setting per row, with the control that changes it at the end.",
      zh: "每行一个设置，改变它的控件位于行尾。",
    }),
    "/design-system/components/form-footer": t({
      en: "The Cancel and Save of a form, in view while a long form scrolls.",
      zh: "表单的「取消」与「保存」，长表单滚动时仍保持可见。",
    }),
    "/design-system/components/empty-state": t({
      en: "What a list or a card shows when it has nothing yet.",
      zh: "列表或卡片还没有内容时显示的内容。",
    }),
    "/design-system/components/columns": t({
      en: "Columns side by side, shared by a ratio, that stack when narrow.",
      zh: "按比例分配宽度的并排多列，变窄时堆叠。",
    }),
    "/design-system/components/radio-group": t({
      en: "One answer of a few, each a radio with an optional description.",
      zh: "从几个答案中选一个，每项是一个可带说明的单选按钮。",
    }),
    "/design-system/components/filter-chips": t({
      en: "One filter of a list, as a row of chips with optional counts.",
      zh: "以一行可带数字的筛选项为列表选择一个筛选条件。",
    }),
    "/design-system/components/select": t({
      en: "A styled native select driven by options or custom children.",
      zh: "样式化的原生下拉选择，支持选项数组或自定义子元素。",
    }),
    "/design-system/components/sheet": t({
      en: "A modal card over the dimmed page that a drag down puts away.",
      zh: "压暗页面之上的模态卡片，向下拖动即可收起。",
    }),
    "/design-system/components/popover": t({
      en: "A surface anchored to its trigger that flips away from the viewport edge.",
      zh: "锚定在触发元素上的浮层，会自动避开视口边缘翻转。",
    }),
    "/design-system/components/progressive-blur": t({
      en: "Progressively blurs the page behind a floating element, instead of dimming it.",
      zh: "在悬浮元素背后渐进虚化页面，而非将其压暗。",
    }),
    "/design-system/components/scroll-mask": t({
      en: "A scroll region whose content blurs on its way out of view at each edge it can still scroll to.",
      zh: "滚动区域在仍可继续滚动的每条边上，将移出视野的内容渐进虚化。",
    }),
    "/design-system/components/sticky-controls": t({
      en: "A row of page chrome parked under the header strip, blurring the page around its controls while it holds.",
      zh: "停在页头下方的一行页面控件，停住期间在控件周围渐进虚化页面。",
    }),
    "/design-system/components/header-footer-layout": t({
      en: "A reading-density page shell with floating header controls and an optional footer.",
      zh: "带悬浮页头控件与可选页脚的阅读密度页面骨架。",
    }),
    "/design-system/components/tab-view": t({
      en: "An app shell: a sidebar or a rail of destinations on wide screens, a floating tab bar on small ones.",
      zh: "应用骨架：宽屏上是目标页的侧边栏或侧轨，小屏上是一枚悬浮标签栏。",
    }),
    "/design-system/components/navigation-split-view": t({
      en: "A sidebar, the content and the detail of what is picked, side by side, with the detail in a sheet on a phone.",
      zh: "侧栏、内容与所选项的详情并排显示；在手机上，详情在面板中打开。",
    }),
    "/design-system/primitives": t({
      en: "Composable StyleX primitives for flex, layout, motion, reset and accessibility, for an element no component fits.",
      zh: "可组合的 StyleX 原语，涵盖 flex、布局、动效、重置与无障碍，用于没有合适组件的元素。",
    }),
    "/design-system/hooks": t({
      en: "Headless React hooks for controlled state, dialog focus, popover placement, tactile press and radiogroups.",
      zh: "无头 React Hook，涵盖受控状态、对话框焦点、弹出层定位、触感按压与单选组。",
    }),
    "/design-system/effect-layer": t({
      en: "Effects drawn with WebGPU over the page, around the elements that register for them. Experimental.",
      zh: "用 WebGPU 绘制在页面之上、环绕为效果登记的元素的效果。仍在实验中。",
    }),
  };
}
