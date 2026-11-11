import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Example } from "#src/design-system/example.tsx";
import {
  GuideNote,
  GuideSection,
} from "#src/design-system/guide/guide-section.tsx";
import { PropsTable } from "#src/design-system/props-table.tsx";

export function PageHeaderShowcase() {
  return (
    <>
      <GuideSection
        title={t({
          en: "Open every page with one.",
          zh: "每个页面都以它开头。",
        })}
        lead={t({
          en: "PageHeader holds the page's title and a sentence that says what the page is for. Every page starts the same way, so a reader knows where they are before they read on.",
          zh: "PageHeader 包含页面标题，以及一句说明页面用途的话。每个页面都以同样的方式开头，读者在往下读之前就知道自己在哪里。",
        })}
      >
        <Example fill>
          <PageHeader
            title={t({ en: "Accounts", zh: "账户" })}
            description={t({
              en: "What the household owns and owes, and whether each account still syncs.",
              zh: "家庭拥有和欠下的一切，以及每个账户是否仍在同步。",
            })}
          />
        </Example>
        <GuideNote>
          {t({
            en: "The title is the page's <h1>, so use one PageHeader on a page.",
            zh: "标题是页面的 <h1>，因此一个页面只用一个 PageHeader。",
          })}
        </GuideNote>
        <GuideNote>
          {t({
            en: "eyebrow adds a short muted line above the title, such as the date of a report.",
            zh: "eyebrow 在标题上方加一行简短的弱化文字，例如报告的日期。",
          })}
        </GuideNote>
      </GuideSection>

      <GuideSection
        title={t({
          en: "Put the page's own actions at the end.",
          zh: "把页面自身的操作放在末尾。",
        })}
        lead={t({
          en: "An action that works on the whole page, such as Add or Export, goes in actions. Where the header is too narrow for the title and the actions side by side, the actions move under the title.",
          zh: "作用于整个页面的操作，例如「添加」或「导出」，放进 actions。标题区宽度不足以让标题与操作并排时，操作会移到标题下方。",
        })}
      >
        <Example fill>
          <PageHeader
            title={t({ en: "Transactions", zh: "交易" })}
            description={t({
              en: "Review this month and fix what the bank sync could not sort.",
              zh: "查看本月交易，修正银行同步未能归类的条目。",
            })}
            actions={
              <>
                <Button
                  look="outline"
                  size="sm"
                  icon={<DownloadSimpleIcon weight="bold" />}
                >
                  {t({ en: "Export", zh: "导出" })}
                </Button>
                <Button size="sm" icon={<PlusIcon weight="bold" />}>
                  {t({ en: "Add transaction", zh: "添加交易" })}
                </Button>
              </>
            }
          />
        </Example>
      </GuideSection>

      <PropsTable component="page-header" />
    </>
  );
}
