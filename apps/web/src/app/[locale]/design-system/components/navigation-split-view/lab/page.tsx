import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { NavigationSplitViewLab } from "#src/design-system/lab/navigation-split-view-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/navigation-split-view");
}

export default function NavigationSplitViewLabPage() {
  return <LabPage lab={NavigationSplitViewLab} />;
}
