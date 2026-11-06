import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { PagerLab } from "#src/design-system/lab/pager-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/pager");
}

export default function PagerLabPage() {
  return <LabPage lab={PagerLab} />;
}
