import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { SheetLab } from "#src/design-system/lab/sheet-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/sheet");
}

export default function SheetLabPage() {
  return <LabPage lab={SheetLab} />;
}
