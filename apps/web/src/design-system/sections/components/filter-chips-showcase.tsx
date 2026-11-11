import { t } from "@tuja/i18n";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import {
  FilterChipsCountsExample,
  FilterChipsOverflowExample,
} from "./filter-chips-specimens.tsx";

export function FilterChipsShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Filter a list with one row of chips.",
          zh: "用一行筛选项筛选列表。",
        })}
        lead={t({
          en: "FilterChips picks one filter of a list, such as All, Filed or Junk. A count after a label says how many items the filter shows before anyone picks it.",
          zh: "FilterChips 为列表选择一个筛选条件，例如全部、已归档或垃圾邮件。标签后的数字说明该筛选会显示多少项，无需先点开查看。",
        })}
      >
        <FilterChipsCountsExample />
        <GuideNote>
          {t({
            en: 'The count is part of the chip\'s name, so a screen reader reads "Problems 1". countIntent="destructive" marks items that need attention.',
            zh: '数字是筛选项名称的一部分，因此读屏软件会读出「问题 1」。countIntent="destructive" 标记需要关注的条目。',
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "The row is one radiogroup: Tab reaches the picked chip, and the arrow keys move the pick.",
            zh: "这一行是一个单选组：Tab 键移到已选的筛选项，方向键移动选择。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "For two to four views of one thing, use Segmented control. For a long list that need not all show, use Select.",
            zh: "同一事物的两到四种视图，请使用分段控件（SegmentedControl）。无需全部展示的长列表，请使用下拉框（Select）。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Let a long row scroll.",
          zh: "让过长的一行滚动。",
        })}
        lead={t({
          en: "The chips stay on one line. A row wider than its box scrolls sideways, and its edges blur while there is more to see. Where a device cannot swipe, scrollButtons adds a button at each end.",
          zh: "筛选项始终在一行内。比容器更宽的一行会横向滚动，还有内容可看时边缘会虚化。在无法滑动的设备上，scrollButtons 会在两端各加一个按钮。",
        })}
      >
        <FilterChipsOverflowExample />
      </GuideSection>

      <PropsTable component="filter-chips" />
    </>
  );
}
