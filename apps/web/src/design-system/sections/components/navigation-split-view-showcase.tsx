import { t } from "@tuja/i18n";
import { Text } from "@tuja/ui/components/text";
import { Suspense } from "react";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ShowcaseHelper } from "#src/design-system/showcase-helper.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import {
  NavigationSplitViewDemo,
  NavigationSplitViewDemoPlaceholder,
} from "./navigation-split-view-specimens.tsx";

export function NavigationSplitViewShowcase() {
  const usage = `import {
  NavigationSplitView,
  SplitViewLink,
} from "@tuja/ui/components/navigation-split-view";

const project = searchParams.get("project");
const task = searchParams.get("task");

<NavigationSplitView
  linkComponent={Link}
  replace={(href) => router.replace(href)}
  closeLabel={closeLabel}
  sidebar={{ node: <ProjectList />, label: projectsLabel }}
  collapsedSidebar={<ProjectIcons />}
  content={{
    node: project ? <Tasks id={project} /> : <Overview />,
    label: project ? projectName : overviewLabel,
    key: project ?? "overview",
    back: project ? { href: overviewHref, label: overviewLabel } : null,
    accessory: <AddButton />,
  }}
  detail={
    task
      ? {
          node: <TaskDetail id={task} />,
          label: taskLabel,
          key: task,
          back: { href: projectHref, label: projectName },
        }
      : null
  }
/>

// In a column: a row that opens the column after it.
<ListRow href={taskHref} linkComponent={SplitViewLink}>{title}</ListRow>`;

  const columnParts = `import {
  StackedOnly,
  UnlessFullSidebar,
  useSplitViewColumn,
} from "@tuja/ui/components/navigation-split-view";
import { splitViewTokens } from "@tuja/ui/components/navigation-split-view.stylex";

function Overview() {
  return (
    <>
      <UnlessFullSidebar>
        <ScreenTitle />
      </UnlessFullSidebar>
      <Summary />
      <StackedOnly>
        <ProjectList />
      </StackedOnly>
    </>
  );
}

function Tasks() {
  // { column, presentation, scroller, close }
  const scroller = useSplitViewColumn()?.scroller;
  return <VirtualRows scrollParent={scroller} />;
}

const styles = stylex.create({
  stickyFooter: {
    position: "sticky",
    insetBlockEnd: \`calc(\${space._3} + \${splitViewTokens.columnInsetBlockEnd})\`,
  },
});`;

  const shared = `import { useSplitViewShared } from "@tuja/ui/components/navigation-split-view";

function ProjectIcon({ project }: { project: Project }) {
  // The same name in the sidebar row and in the collapsed sidebar's tile.
  const ref = useSplitViewShared(\`project:\${project.id}\`);
  return <span ref={ref}>{project.icon}</span>;
}`;

  return (
    <>
      <Showcase
        label={t({ en: "Three columns", zh: "三栏" })}
        frame="plain"
        breakout
      >
        <ShowcaseHelper>
          {t({
            en: "Pick a project, then a task, and pick a width for the frame. Wide shows the sidebar beside the content, and folds it to the collapsed sidebar when the task opens. Medium keeps the collapsed sidebar, and has no room for the task beside the content, so the task opens in a sheet. Phone shows one column, and the task opens in a sheet too. Esc or ← closes the task, J and K move between the rows of a column, and the URL holds every pick.",
            zh: "选一个项目，再选一个任务，并为框选一个宽度。“宽”时侧栏在内容栏旁边，任务打开时侧栏收起。“中”时保持收起侧栏，内容栏旁边放不下任务，因此任务在面板中打开。“手机”时只显示一栏，任务同样在面板中打开。Esc或 ← 关闭任务，J与K在一栏的各行之间移动，每一次选择都写在URL里。",
          })}
        </ShowcaseHelper>
        <Suspense fallback={<NavigationSplitViewDemoPlaceholder />}>
          <NavigationSplitViewDemo />
        </Suspense>
      </Showcase>

      <Showcase label={t({ en: "Composition", zh: "构成" })} leadsWithText>
        <Text look="bodySmall">
          {t({
            en: "The view fits its columns to its own width, not to the screen's. While the detail shows beside the content, the sidebar folds to the collapsed sidebar, at every width, so the content keeps its room. Without a detail, the full sidebar shows where it fits, and the collapsed sidebar where it does not.",
            zh: "视图按自身的宽度而不是屏幕的宽度安排各栏。详情栏显示在内容栏旁边时，侧栏在任何宽度下都收起为收起侧栏，让内容栏保有空间。没有详情栏时，完整侧栏放得下就显示，放不下就显示收起侧栏。",
          })}
        </Text>
        <Text look="bodySmall">
          {t({
            en: "On a phone the view stacks: the content fills it, and its back link leads to the column under it. The detail then opens in a sheet over the content and the tab bar, and closing the sheet goes back to the content.",
            zh: "在手机上视图会堆叠：内容栏占满视图，其返回链接通往下面一栏。此时详情在覆盖内容栏与标签栏的面板中打开，关闭面板即回到内容栏。",
          })}
        </Text>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "A container query lays out the columns, so the server paints them right. A column that does not show keeps its place in the DOM and its scroll.",
            zh: "各栏由容器查询排布，因此服务器直接绘制正确的结果。不显示的栏仍留在DOM中并保留滚动位置。",
          })}
        </Text>
      </Showcase>

      <Showcase
        label={t({ en: "History and keys", zh: "历史记录与按键" })}
        leadsWithText
      >
        <Text look="bodySmall">
          {t({
            en: "A column link that opens a deeper column adds a history entry. One that changes what an open column shows replaces the entry. Closing a column goes back one entry where that entry is the column under it, and else replaces the entry. Thus Back takes off one column at a time, and never shows a column that was closed.",
            zh: "打开更深一栏的栏内链接会新增一条历史记录；改变已打开的栏所显示内容的链接则替换当前记录。关闭一栏时，如果上一条记录正是下面那一栏，就后退一条，否则替换当前记录。因此“返回”每次只退出一栏，也不会再显示已关闭的栏。",
          })}
        </Text>
        <Text look="bodySmall">
          {t({
            en: "Esc and ← close the deepest column. J and K move focus to the next and the previous row of the column that has focus, and Enter and → open it. The keys leave fields, controls that use the arrow keys, sheets and dialogs alone.",
            zh: "Esc与 ← 关闭最深的一栏。J与K把焦点移到当前栏的下一行与上一行，Enter与 → 打开它。这些按键不会干扰输入框、使用方向键的控件、面板与对话框。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Motion", zh: "动效" })}>
        <UsageSnippet code={shared} label="tsx" />
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Every motion follows the URL, and the first paint has none. A deeper page springs in over the page it leaves, which drifts back and dims, and Back springs it out again. A detail slides in beside the content as the sidebar folds. Give one name to each form of a Shared element, and the view flies one into the other, such as a project's icon into its tile in the collapsed sidebar. On a phone, a drag from the left edge of the content takes it off, and a sheet lifts out of the row that opened it. A pick in the middle of a motion starts from where the motion is. Under reduced motion, each change is a short cross-fade.",
            zh: "每一个动效都跟随URL，首次绘制没有动效。更深的一页以弹簧动效进入，盖在它离开的那一页上，那一页向后退并变暗；“返回”再把它弹出。详情栏在侧栏收起的同时从旁边滑入。为共享元素的每一种形态取同一个名字，视图就会把一种形态飞成另一种，例如项目的图标飞进收起侧栏中它的方块。在手机上，从内容栏左边缘拖动即可退出该栏，面板从打开它的那一行中升起。在动效进行中做出新的选择，会从动效当前的位置开始。在减少动态效果时，每次变化都是一次短暂的交叉淡入淡出。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet code={usage} label="tsx" />
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Pass detail only while something is picked, with the back that closes it. A row that opens the column after it renders through SplitViewLink, which follows the history rule and takes J and K. A key that changes starts its column at the top again, and in the detail the old content fades out as the new content fades in. Each column is a Scroll region of its own, and lays its node out as a flex column at least as tall as itself. Inside a Tab view narrower than 30rem, as on a phone, the page scrolls the content instead, so that it goes under the status bar of the browser. The accessory floats at the bottom end of its column, above the floating tab bar of a Tab view, and the column keeps room for it after its content, so the last row scrolls clear of it.",
            zh: "只在有选中项时传入detail，并带上关闭它的back。打开下一栏的行通过SplitViewLink渲染，它遵循历史规则，并响应J与K。key改变时，该栏回到顶部；在详情栏中，旧内容淡出，新内容淡入。每一栏都是一个独立的滚动区域，并把其node排成一个至少与该栏等高的弹性纵列。在宽度小于30rem的Tab view中（例如在手机上），改由页面滚动内容栏，让内容能滚到浏览器状态栏下方。accessory悬浮在其所在栏的底部末端、Tab view悬浮标签栏之上；该栏在内容之后为它留出空间，因此最后一行可以滚动到它上方而不被遮住。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Inside a column", zh: "栏内" })}>
        <UsageSnippet code={columnParts} label="tsx" />
        <Text look="bodySmall" tone="muted">
          {t({
            en: "StackedOnly shows its children only where the content fills the view, such as the list that the sidebar shows otherwise, and UnlessStacked only where it does not, such as a title that a stacked headline already names. UnlessFullSidebar shows its children only where the full sidebar does not, such as the screen's title. CSS decides all three, so the first paint is right. useSplitViewColumn tells a column which it is, whether it shows in a sheet, the box that scrolls it, undefined where the page does, and how to close it. A sticky footer in a column sticks splitViewTokens.columnInsetBlockEnd plus its own gap above the bottom.",
            zh: "StackedOnly只在内容栏占满视图时显示其子元素，例如侧栏本会显示的列表；UnlessStacked只在内容栏不占满视图时显示其子元素，例如堆叠时标题已在上方给出的小标题。UnlessFullSidebar只在完整侧栏不显示时显示其子元素，例如画面的标题。三者都由CSS决定，因此首次绘制就是正确的。useSplitViewColumn告诉一栏它是哪一栏、是否显示在面板中、滚动它的盒子（由页面滚动时为undefined），以及如何关闭它。栏内的粘性页脚粘在距底部splitViewTokens.columnInsetBlockEnd再加上自身间距的位置。",
          })}
        </Text>
      </Showcase>

      <PropsTable component="navigation-split-view" />
    </>
  );
}
