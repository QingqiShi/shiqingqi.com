import { t } from "@tuja/i18n";
import { Pager } from "@tuja/ui/components/pager";

/**
 * The pair apart in two columns, label above title and a caret on each outer
 * edge: the shape that separates a pager from two plain links. The tile is
 * `inert`, so the placeholder `href`s are never followed.
 */
export function PagerSpecimen() {
  return (
    <Pager
      aria-label={t({ en: "Previous and next pages", zh: "上一页与下一页" })}
      previous={{
        href: "#",
        label: t({ en: "Previous", zh: "上一页" }),
        title: t({ en: "Setup", zh: "设置" }),
      }}
      next={{
        href: "#",
        label: t({ en: "Next", zh: "下一页" }),
        title: t({ en: "Layout", zh: "布局" }),
      }}
    />
  );
}
