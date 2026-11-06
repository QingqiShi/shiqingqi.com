import type { PageProps } from "@tuja/i18n/types";
import { LabPage, labMetadata } from "#src/design-system/lab/lab-page.tsx";
import { SkeletonLab } from "#src/design-system/lab/skeleton-lab.tsx";

export async function generateMetadata(props: PageProps) {
  return labMetadata(props, "/design-system/components/skeleton");
}

export default function SkeletonLabPage() {
  return <LabPage lab={SkeletonLab} />;
}
