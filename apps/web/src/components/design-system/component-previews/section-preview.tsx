import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { Section } from "@tuja/ui/components/section";
import { Text } from "@tuja/ui/components/text";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * The heading row with something under it, which is the whole component: a
 * section with no body would look like a stray label. Fills the plate width
 * because the label and its content share one measure.
 */
export function SectionPreview() {
  return (
    <div css={previewLayout.fill}>
      <Section
        title={t({ en: "Cast & crew", zh: "演职人员" })}
        icon={<FilmSlateIcon weight="bold" />}
      >
        <Text variant="bodySmall" tone="muted">
          {t({ en: "Twelve credited roles", zh: "十二个署名角色" })}
        </Text>
      </Section>
    </div>
  );
}
