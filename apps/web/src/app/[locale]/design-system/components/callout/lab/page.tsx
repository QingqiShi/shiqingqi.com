import type { PageProps } from "@tuja/i18n/types";
import { CalloutLab } from "#src/design-system/lab/callout-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/callout");
}

export default function CalloutLabPage() {
  return <LabPage lab={CalloutLab} />;
}
