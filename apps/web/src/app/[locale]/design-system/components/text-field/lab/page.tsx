import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { TextFieldLab } from "#src/design-system/lab/text-field-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/text-field");
}

export default function TextFieldLabPage() {
  return <LabPage lab={TextFieldLab} />;
}
