"use client";

import { ListBulletsIcon } from "@phosphor-icons/react/dist/ssr/ListBullets";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import type { SupportedLocale } from "@tuja/i18n/types";
import { Button } from "@tuja/ui/components/button";
import {
  SplitViewLink,
  StackedOnly,
} from "@tuja/ui/components/navigation-split-view";

/**
 * The way to the list of reports, only where the list does not show beside the
 * report.
 */
export function ReportPastLink({ locale }: { locale: SupportedLocale }) {
  return (
    <StackedOnly>
      <div>
        <Button
          href={getLocalePath("/reports", locale)}
          linkComponent={SplitViewLink}
          look="ghost"
          size="sm"
          icon={<ListBulletsIcon weight="bold" />}
        >
          {t({ en: "Past reports", zh: "往期晨报" })}
        </Button>
      </div>
    </StackedOnly>
  );
}
