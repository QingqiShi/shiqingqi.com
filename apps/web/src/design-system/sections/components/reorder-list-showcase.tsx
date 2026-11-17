import { t } from "@tuja/i18n";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { ReorderListExample } from "./reorder-list-example.tsx";

export function ReorderListShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Let people put rows in their own order.",
          zh: "让人按自己的顺序排列各行。",
        })}
        lead={t({
          en: "Drag a row by its handle, with a finger or a pointer, or focus the handle and press Up or Down. The rows it passes make room on the system's spring.",
          zh: "用手指或指针拖动行的手柄，或让手柄获得焦点后按上下方向键。被经过的行会以系统弹簧让出位置。",
        })}
      >
        <ReorderListExample />
        <GuideNote>
          {t({
            en: "A row in fixed keeps its place: it has no handle, and no row moves past it.",
            zh: "fixed 中的行保持原位：它没有手柄，其他行也不能越过它。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "While a row is held near the top or bottom of the screen, the list scrolls.",
            zh: "拖着一行靠近屏幕顶部或底部时，列表会滚动。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "Where each row has a menu, turn keyboard off and put moveUp and moveDown in the menu, so that a row is one stop for Tab.",
            zh: "每行都有菜单时，可关闭 keyboard，并把 moveUp 和 moveDown 放进菜单，让每行只占一个 Tab 停靠点。",
          })}
        </GuideNote>
      </GuideSection>

      <PropsTable component="reorder-list" />
    </>
  );
}
