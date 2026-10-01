import { Breadcrumb } from "@tuja/ui/components/breadcrumb";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Three short crumbs, chevrons between them, the last one emphasised — the
 * shape that separates a breadcrumb from any other row of small text.
 *
 * No hrefs, following the Chip specimen: the plate is inert, so an anchor here
 * would only advertise a destination the tile can't take you to. Items without
 * one render as plain text, and the trailing crumb keeps the current-page
 * emphasis either way.
 */
export function BreadcrumbSpecimen() {
  return (
    <div css={specimenLayout.row}>
      <Breadcrumb
        label={t({ en: "Breadcrumb", zh: "面包屑导航" })}
        items={[
          { label: t({ en: "Home", zh: "首页" }) },
          { label: t({ en: "Movies", zh: "电影" }) },
          { label: t({ en: "Dune", zh: "沙丘" }) },
        ]}
      />
    </div>
  );
}
