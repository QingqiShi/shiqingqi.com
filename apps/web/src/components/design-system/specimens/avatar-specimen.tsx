import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { Avatar } from "@tuja/ui/components/avatar";
import { t } from "#src/i18n.ts";
import { specimenLayout } from "./specimen.stylex.ts";

/**
 * A badged medallion beside a plain one — the pair that shows what the corner
 * slot does without a third avatar to compare against. Both fall back to the
 * monogram: a portrait here would be one specific person's face standing in for
 * the component, and the tile has no one to show.
 */
export function AvatarSpecimen() {
  return (
    <div css={specimenLayout.row}>
      <Avatar
        name={t({ en: "Ada Lovelace", zh: "阿达·洛芙莱斯" })}
        variant="solid"
        badge={<CheckIcon weight="bold" />}
        badgeLabel={t({ en: "verified", zh: "已验证" })}
      />
      <Avatar name={t({ en: "Grace Hopper", zh: "格蕾丝·霍珀" })} />
    </div>
  );
}
