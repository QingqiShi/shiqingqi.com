"use client";

import { NavigationSplitView } from "@tuja/ui/components/navigation-split-view";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { SkeletonList } from "../shell/skeleton-list.tsx";
import { TodoSearchBoxSkeleton } from "./todo-search-box.tsx";
import { TodosHeader } from "./todos-header.tsx";

/** The to-dos before they can show: the header of the page over a list. */
export function TodosSkeleton({ title }: { title: string }) {
  return (
    <NavigationSplitView
      content={{
        label: title,
        node: (
          <div css={stack.group} aria-busy>
            <TodosHeader title={title}>
              <TodoSearchBoxSkeleton />
            </TodosHeader>
            <SkeletonList rows={5} width="60%" />
          </div>
        ),
      }}
    />
  );
}
