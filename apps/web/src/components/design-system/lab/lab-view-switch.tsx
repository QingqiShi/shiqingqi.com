"use client";

import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { getLocalePath } from "#src/utils/get-locale-path.ts";
import { normalizePath } from "#src/utils/normalize-path.ts";
import type { DesignSystemView } from "../routes/types.ts";

interface LabViewSwitchProps {
  /** The documentation route. Its Lab is this path plus `/lab`. */
  docsPath: string;
}

/**
 * The switch between a component's two views. The selected segment comes from
 * the pathname rather than from a prop, so it follows a client navigation as
 * soon as the router reports it.
 */
export function LabViewSwitch({ docsPath }: LabViewSwitchProps) {
  const locale = useLocale();
  const router = useRouter();
  const labPath = `${docsPath}/lab`;
  const view: DesignSystemView =
    normalizePath(usePathname()) === labPath ? "lab" : "docs";

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
