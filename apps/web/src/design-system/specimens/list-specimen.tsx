import { List } from "@tuja/ui/components/list";
import { ListRow } from "@tuja/ui/components/list-row";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * Three link rows, each with a caret — the shape that tells a list of things
 * to open from a table of values. The tile is `inert`, so the placeholder
 * `href` is never followed.
 */
export function ListSpecimen() {
  return (
    <div css={specimenLayout.fill}>
      <List aria-label={t({ en: "List", zh: "列表" })}>
        <ListRow href="#">{t({ en: "Accounts", zh: "账户" })}</ListRow>
        <ListRow href="#">{t({ en: "Categories", zh: "分类" })}</ListRow>
        <ListRow href="#">{t({ en: "Rules", zh: "规则" })}</ListRow>
      </List>
    </div>
  );
}
