import type { PageProps } from "@tuja/i18n/types";
import { CodeBlockLab } from "#src/design-system/lab/code-block-lab.tsx";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/code-block");
}

export default function CodeBlockLabPage() {
  return <LabPage lab={CodeBlockLab} />;
}
