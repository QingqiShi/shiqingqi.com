import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { TabViewLab } from "#src/design-system/lab/tab-view-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/tab-view");
}

export default function TabViewLabPage() {
  return <LabPage lab={TabViewLab} />;
}
