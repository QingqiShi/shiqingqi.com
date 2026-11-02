import { Heading } from "@tuja/ui/components/heading";
import { Skeleton } from "@tuja/ui/components/skeleton";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { AssistantPageColumn } from "./assistant-page-column.tsx";
import { SkeletonList } from "./skeleton-list.tsx";

/** A screen before it can show: a title over a list. Without a `title`, the title is a block too. */
export function ScreenSkeleton({ title }: { title?: string }) {
  return (
    <AssistantPageColumn>
      <div css={stack.item} aria-busy>
        {title === undefined ? (
          <Skeleton width="8rem" height="1.5rem" />
        ) : (
          <Heading level={1} look="h3">
            {title}
          </Heading>
        )}
        <SkeletonList rows={5} width="60%" />
      </div>
    </AssistantPageColumn>
  );
}
