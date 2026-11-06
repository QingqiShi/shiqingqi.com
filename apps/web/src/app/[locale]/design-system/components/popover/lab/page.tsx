import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { PopoverLab } from "#src/design-system/lab/popover-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/popover");
}

export default function PopoverLabPage() {
  return <LabPage lab={PopoverLab} />;
}
