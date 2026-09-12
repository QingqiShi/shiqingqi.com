import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import { AnchorButton } from "@tuja/ui/components/anchor-button";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * A destination beside a plain one, at the same height: the pair says the
 * component is a link wearing a Button's looks. The tile is `inert`, so the
 * placeholder `href` is never followed.
 */
export function AnchorButtonSpecimen() {
  return (
    <div css={specimenLayout.row}>
      <AnchorButton
        href="#"
        look="primary"
        icon={<ArrowRightIcon weight="bold" />}
      >
        {t({ en: "Browse films", zh: "浏览影片" })}
      </AnchorButton>
      <AnchorButton href="#">{t({ en: "Back", zh: "返回" })}</AnchorButton>
    </div>
  );
}
