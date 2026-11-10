import { t } from "@tuja/i18n";
import { FlowBlock } from "@tuja/ui/components/flow-block";
import { Text } from "@tuja/ui/components/text";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Showcase } from "#src/design-system/showcase.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";
import { UsageSnippet } from "#src/design-system/usage-snippet.tsx";
import { DestinationsNavList, GroupedNavList } from "./nav-list-specimens.tsx";

export function NavListShowcase() {
  return (
    <>
      <Showcase
        label={t({ en: "When to use it", zh: "何时使用" })}
        leadsWithText
      >
        <Text look="bodySmall" tone="muted">
          {t({
            en: "Use NavList for the links that move between the pages of one place, such as the sections of a settings screen or the pages of a documentation site. It is a list and nothing more: put it in the sidebar of a Navigation split view, with SplitViewLink as its linkComponent, and the view places it and marks the row that opens. It sits inside your own <nav>, which names the landmark. For an app's few top-level destinations, use Tab view; for rows that each open something, use List.",
            zh: "在同一处的各页面之间切换的链接都使用 NavList，例如设置界面的各分区或文档站的各页面。它只是一个列表：把它放进 Navigation split view 的侧栏，并以 SplitViewLink 作为其 linkComponent，由视图决定它的位置并标记正在打开的行。它放在你自己的 <nav> 中，由 <nav> 为地标命名。应用的少数顶层目标页请用 Tab view；每一行都能打开某个内容的列表请用 List。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Links", zh: "链接" })}>
        <Specimen caption="icon, current, trailing">
          <DestinationsNavList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'Each NavLink is a row that pads its own text, and the rows touch. The links are the strongest text in the list, in the full text colour. current sets aria-current="page", which gives the link a semibold weight and moves the one marker of the list under it. The marker has the look of the hover fill. When the current page changes, the marker springs from the old row to the new row, and the hover fill of the clicked row fades out as the marker comes over it. Inside an EffectLayerProvider with WebGPU, where both rows have an icon on screen, a small wisp of dust also goes from the old icon to the new icon and lands as the marker settles, so the eye follows the move. The rest of the row sheds nothing. When the old row is off screen, there is no dust: the hover fill of the clicked row becomes the marker, or with touch the marker grows in. This is the one effect in the list, because it answers a navigation. When a group opens or closes, the marker moves with its row, with no dust. With a mouse or a trackpad, one hover fill glides from row to row under the pointer and fades out when the pointer leaves the list; it does not show on the row of the marker. Touch gets no hover. Under reduced motion both move at once, with no dust. The fills start on the box edge of the list, and the content starts on the text edge, after the padding. icon puts a muted icon at the start of the row, and trailing puts a count, a Badge or a StatusDot at its end; trailing is part of the link\'s name. A row is as tall as a small control, and under a coarse pointer it is at least 44px tall.',
            zh: '每个 NavLink 都是一个自带文字内边距的行，各行彼此相接。链接是列表中最醒目的文字，使用全强度的文字颜色。current 设置 aria-current="page"，为链接加上半粗字重，并把列表中唯一的标记移到它下方。标记与悬停填充外观相同。当前页面变化时，标记从旧行弹性移动到新行，被点击行的悬停填充在标记到来时淡出。在带有 WebGPU 的 EffectLayerProvider 之内，若两行都有图标且都在屏幕上，还会有一小缕灰尘从旧图标飞入新图标，并在标记落定时到达，让视线随着这次移动。行的其余部分不抖落灰尘。旧行不在屏幕上时没有灰尘：被点击行的悬停填充直接成为标记；触摸操作时标记渐显长出。这是列表中唯一的效果，因为它回应的是一次导航。分组展开或收起时，标记随所在的行移动，没有灰尘。使用鼠标或触控板时，一个悬停填充随指针在各行间滑动，指针离开列表时淡出；它不会出现在标记所在的行上。触摸操作没有悬停效果。在减少动态效果的设置下，两者都直接到位，没有灰尘。填充从列表的盒边缘开始，内容在内边距之后、从文字边缘开始。icon 在行首放置一个弱化的图标，trailing 在行尾放置一个数量、Badge 或 StatusDot；trailing 属于链接名称的一部分。每行与小号控件同高；在粗指针设备上，每行至少高 44px。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Groups", zh: "分组" })}>
        <Specimen caption="NavGroup, label, icon, current">
          <GroupedNavList />
        </Specimen>
        <FlowBlock data-prose>
          <Text look="bodySmall" tone="muted">
            {t({
              en: "NavGroup sets rows apart, and its label names the group for a screen reader too. A group in the list is a section: its label is a small muted caption on the text edge, directly on its first row, and sections are an item step apart. A group in a group is a row the size of a link, with an optional icon and a chevron at its end; the row opens and closes the group. The rows grow open from the row on a spring, the rows below move down with them, and the chevron turns on the same spring; a press mid-way turns them back from where they are. While the group is closed, the marker rests on its row if it holds the current page. Its rows are indented under a thin guide line, so their text starts where the group's text starts. Mark the group that holds the current page with current: it is open from the first render, and the others start closed. The structure sets every space, so you write none.",
              zh: "NavGroup 把各行分开，其 label 同时为读屏软件命名该分组。直接位于列表中的分组是一个分区：其标签是位于文字边缘、紧贴第一行的弱化小字，各分区之间是条目间距。位于分组中的分组是一个与链接同高的行，可带图标，末端有一个箭头；点击该行可展开或收起分组。各行以弹簧动效从该行中展开，下方的行随之下移，箭头也以同一弹簧转动；动画中途再次点击，会从当前位置折返。分组收起时，若其中包含当前页面，标记会停在该分组的行上。其中的各行缩进于一条细引导线之下，文字与分组行的文字从同一处开始。用 current 标记包含当前页面的分组：它从首次渲染起即为展开状态，其他分组初始为收起状态。所有间距都由结构决定，你无需自己设置。",
            })}
          </Text>
        </FlowBlock>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";

<nav aria-label="Docs">
  <NavList linkComponent={Link}>
    <NavGroup label="Guides">
      <NavGroup label="Basics" icon={<BookOpenIcon weight="bold" />} current>
        <NavLink href="/install" current>Install</NavLink>
        <NavLink href="/first-page">First page</NavLink>
      </NavGroup>
    </NavGroup>
  </NavList>
</nav>`}
          label="tsx"
        />
      </Showcase>

      <PropsTable component="nav-list" />

      <PropsTable component="nav-group" />

      <PropsTable component="nav-link" />
    </>
  );
}
