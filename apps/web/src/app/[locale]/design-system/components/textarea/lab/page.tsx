import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { TextareaLab } from "#src/design-system/lab/textarea-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/textarea");
}

export default function TextareaLabPage() {
  return <LabPage lab={TextareaLab} />;
}
