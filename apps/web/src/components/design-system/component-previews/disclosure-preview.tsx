import { Disclosure } from "@tuja/ui/components/disclosure";
import { Text } from "@tuja/ui/components/text";
import { t } from "#src/i18n.ts";
import { previewLayout } from "./preview.stylex.ts";

/**
 * Shown open. Collapsed, a disclosure is a row with a caret and nothing to say
 * it reveals anything; `defaultOpen` puts the panel and its rule on screen, so
 * the tile advertises the behaviour rather than the trigger. Nothing here can be
 * toggled — the overview tray is inert — so the uncontrolled form is safe.
 */
export function DisclosurePreview() {
  return (
    <div css={previewLayout.fill}>
      <Disclosure
        variant="card"
        defaultOpen
        summary={t({ en: "Production notes", zh: "制作说明" })}
      >
        <Text variant="bodySmall" tone="muted">
          {t({ en: "Shot on location over 40 days.", zh: "实景拍摄四十天。" })}
        </Text>
      </Disclosure>
    </div>
  );
}
