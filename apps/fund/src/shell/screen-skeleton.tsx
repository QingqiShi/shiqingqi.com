"use client";

import { t } from "@tuja/i18n";
import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { NavigationStack } from "@tuja/ui/components/navigation-stack";
import { PageHeader } from "@tuja/ui/components/page-header";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";

const ROWS = 5;

/** A screen before it can show: a title over a list. Without a `title`, the title is a block too. */
export function ScreenSkeleton({ title }: { title?: string }) {
  return (
    <NavigationStack label={title ?? t({ en: "Loading", zh: "加载中" })}>
      <div css={stack.group} aria-busy>
        {title === undefined ? (
          <Skeleton width="8rem" height="1.5rem" />
        ) : (
          <PageHeader size="sm" title={title} />
        )}
        <List>
          {Array.from({ length: ROWS }, (_, index) => (
            <ListRow key={index}>
              <Skeleton width="60%" height="1em" delay={index * 100} />
            </ListRow>
          ))}
        </List>
      </div>
    </NavigationStack>
  );
}
