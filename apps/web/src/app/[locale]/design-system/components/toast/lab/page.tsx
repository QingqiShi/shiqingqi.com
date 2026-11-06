import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { ToastLab } from "#src/design-system/lab/toast-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/toast");
}

export default function ToastLabPage() {
  return <LabPage lab={ToastLab} />;
}
