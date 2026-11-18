"use client";

import { t } from "@tuja/i18n";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { SkeletonList } from "./skeleton-list.tsx";

/** A screen before it can show: a title over a list. Without a `title`, the title is a block too. */
export function ScreenSkeleton({ title }: { title?: string }) {
  return (
    <NavigationStack label={title ?? t({ en: "Loading", zh: "加载中" })}>
      <div css={stack.item} aria-busy>
        {title === undefined ? (
          <Skeleton width="8rem" height="1.5rem" />
        ) : (
          <PageHeader title={title} />
        )}
        <SkeletonList rows={5} width="60%" />
      </div>
    </NavigationStack>
  );
}
