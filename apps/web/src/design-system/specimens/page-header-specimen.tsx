import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { t } from "@tuja/i18n";
import { Button } from "@tuja/ui/components/button";
import { PageHeader } from "@tuja/ui/components/page-header";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * A title, a short description and one action: the three parts a reader
 * meets at the top of every page. The tile is `inert`, so its `<h1>` is out
 * of the overview's outline.
 */
export function PageHeaderSpecimen() {
  return (
    <PageHeader
      title={t({ en: "Accounts", zh: "账户" })}
      description={t({
        en: "What you own and owe.",
        zh: "你拥有和欠下的一切。",
      })}
      actions={
        <Button size="xs" look="outline" icon={<PlusIcon weight="bold" />}>
          {t({ en: "Add", zh: "添加" })}
        </Button>
      }
      css={specimenLayout.fill}
    />
  );
}
