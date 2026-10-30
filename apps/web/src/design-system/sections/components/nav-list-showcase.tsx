import { t } from "@tuja/i18n";
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
            en: "Use NavList for the links that move between the pages of one place: a rail beside the content, the sections of a settings screen, the menu in a drawer. It sits inside your own <nav>, which names the landmark. For an app's top-level destinations on a small screen, use Tab bar; for rows that each open something, use List.",
            zh: "在同一处的各页面之间切换的链接都使用NavList：内容旁的侧栏、设置界面的各分区、抽屉里的菜单。它放在你自己的 <nav> 中，由 <nav> 为地标命名。小屏幕上应用的顶层目标页请用标签栏；每一行都能打开某个内容的列表请用List。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Links", zh: "链接" })}>
        <Specimen caption="leading, current">
          <DestinationsNavList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: 'Each NavLink pads itself and the rows take no gap, so that padding is the space between them: a gap would double it. current sets aria-current="page", which gives the link the selected fill and full-strength text. leading puts an icon before the name. Under a coarse pointer every row is at least 44px tall.',
            zh: '每个NavLink自带内边距，行与行之间不留间距，这段内边距就是它们之间的空白：再加间距会使空白加倍。current设置aria-current="page"，为链接加上选中填充并使文字以全强度显示。leading在名称之前放置图标。在粗指针设备上，每行至少高44px。',
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Groups", zh: "分组" })}>
        <Specimen caption="NavGroup, label">
          <GroupedNavList />
        </Specimen>
        <Text look="bodySmall" tone="muted">
          {t({
            en: "NavGroup sets links apart, and its label names the group for a screen reader too. Groups nest one level: a group in the list shows its label as an overline, a group in a group as a muted caption. The space follows the depth, so a label sits closer to its own links than to the group above it: a short step under a label, so the current link's pill clears it, the item step between groups in a group, and the group step between groups in the list.",
            zh: "NavGroup把链接分开，其label同时为读屏软件命名该分组。分组可以嵌套一层：直接位于列表中的分组以上标文字显示标签，位于分组中的分组以弱化的说明文字显示。间距随层级变化，使标签离自己的链接比离上方分组更近：标签下方留出小间距，使当前链接的胶囊背景不贴住标签，分组内的分组之间用条目间距，列表中的分组之间用分组间距。",
          })}
        </Text>
      </Showcase>

      <Showcase label={t({ en: "Usage", zh: "用法" })}>
        <UsageSnippet
          code={`import { NavGroup } from "@tuja/ui/components/nav-group";
import { NavLink } from "@tuja/ui/components/nav-link";
import { NavList } from "@tuja/ui/components/nav-list";

<nav aria-label="Docs">
  <NavList linkComponent={Link}>
    <NavGroup label="Guides">
      <NavLink href="/install" current>Install</NavLink>
      <NavLink href="/tokens">Tokens</NavLink>
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
