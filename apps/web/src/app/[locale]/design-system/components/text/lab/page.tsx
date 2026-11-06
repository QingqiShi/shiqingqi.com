import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { TextLab } from "#src/design-system/lab/text-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/text");
}

export default function TextLabPage() {
  return <LabPage lab={TextLab} />;
}
