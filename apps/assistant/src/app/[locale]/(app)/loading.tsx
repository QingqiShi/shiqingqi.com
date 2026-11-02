import { AssistantPageColumn } from "#src/assistant/shell/assistant-page-column.tsx";
import { ScreenSkeleton } from "#src/assistant/shell/screen-skeleton.tsx";

export default function Loading() {
  return (
    <AssistantPageColumn>
      <ScreenSkeleton />
    </AssistantPageColumn>
  );
}
