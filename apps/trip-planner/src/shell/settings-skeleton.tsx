"use client";

import { t } from "@tuja/i18n";
import { Heading } from "@tuja/ui/components/heading";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { SkeletonRows } from "./skeleton-rows.tsx";

/** Settings before it can show: the title over its rows. */
export function SettingsSkeleton() {
  const title = t({ en: "Settings", zh: "设置" });
  return (
    <NavigationStack label={title} css={pageColumn.settings}>
      <div css={stack.item} aria-busy>
        <Heading level={1} look="h1">
          {title}
        </Heading>
        <SkeletonRows rows={3} />
      </div>
    </NavigationStack>
  );
}
