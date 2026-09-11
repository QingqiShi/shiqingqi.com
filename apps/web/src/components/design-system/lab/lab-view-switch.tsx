"use client";

import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { useRouter } from "next/navigation";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/get-locale-path.ts";
import { useDesignSystemView } from "./use-design-system-view.ts";

interface LabViewSwitchProps {
  docsPath: string;
}

export function LabViewSwitch({ docsPath }: LabViewSwitchProps) {
  const locale = useLocale();
  const router = useRouter();
  const labPath = `${docsPath}/lab`;
  const view = useDesignSystemView(docsPath);

  return (
    <SegmentedControl
      size="sm"
      aria-label={t({ en: "View", zh: "视图" })}
      value={view}
      options={[
        { value: "docs", label: t({ en: "Docs", zh: "文档" }) },
        { value: "lab", label: t({ en: "Lab", zh: "实验室" }) },
      ]}
      onChange={(next) => {
        router.push(getLocalePath(next === "lab" ? labPath : docsPath, locale));
      }}
    />
  );
}
