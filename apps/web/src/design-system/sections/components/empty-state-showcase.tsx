import { HouseIcon } from "@phosphor-icons/react/dist/ssr/House";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { Card } from "@tuja/ui/components/card";
import { CardHeader } from "@tuja/ui/components/card-header";
import { CardTitle } from "@tuja/ui/components/card-title";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";
import { Specimen } from "#src/design-system/specimen.tsx";

export function EmptyStateShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Say what is missing, and how to fill it.",
          zh: "说明缺少什么，以及如何填补。",
        })}
        lead={t({
          en: "Where a list or a card has nothing yet, EmptyState takes its place: a short title, a line that says why, and the action that fills it.",
          zh: "列表或卡片还没有内容时，由 EmptyState 占据它的位置：一个简短的标题、一行说明原因的文字，以及填补它的操作。",
        })}
      >
        <Example fill>
          <Card>
            <CardHeader>
              <CardTitle level={2}>
                {t({ en: "Property", zh: "房产与车辆" })}
              </CardTitle>
            </CardHeader>
            <EmptyState
              icon={<HouseIcon weight="bold" />}
              title={t({ en: "No property yet", zh: "还没有房产或车辆" })}
              description={t({
                en: "Add a home or a car by hand, and update its value when it changes.",
                zh: "手动添加房屋或车辆，并在价值变化时更新。",
              })}
              action={
                <Button
                  look="outline"
                  size="sm"
                  icon={<PlusIcon weight="bold" />}
                >
                  {t({ en: "Add property", zh: "添加房产" })}
                </Button>
              }
            />
          </Card>
        </Example>
        <GuideNote>
          {t({
            en: "The title is an <h3> by default, for a card or a section under an <h2>. Set level to fit the outline of the page.",
            zh: "标题默认为 <h3>，适用于 <h2> 之下的卡片或分区。请按页面大纲设置 level。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Leave out the action when there is nothing to do.",
          zh: "无事可做时，省略操作。",
        })}
        lead={t({
          en: "A search or a filter that finds nothing needs no button: say what to change instead. The icon is decoration, so the title alone must say what is missing.",
          zh: "搜索或筛选没有结果时不需要按钮，改为说明该调整什么。图标只是装饰，因此仅凭标题就要说清缺少什么。",
        })}
      >
        <Specimen caption={t({ en: "no action", zh: "无操作" })}>
          <EmptyState
            icon={<MagnifyingGlassIcon weight="bold" />}
            title={t({
              en: "No transactions match",
              zh: "没有符合条件的交易",
            })}
            description={t({
              en: "Try a shorter word, or clear the filters.",
              zh: "试试更短的关键词，或清除筛选条件。",
            })}
          />
        </Specimen>
      </GuideSection>

      <PropsTable component="empty-state" />
    </>
  );
}
