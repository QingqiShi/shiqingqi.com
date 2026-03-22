import * as stylex from "@stylexjs/stylex";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { AIChatView } from "./ai-chat-view";
import translations from "./translations.json";

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);
  const { t } = getTranslations(translations, validatedLocale);

  return (
    <AIChatView
      locale={validatedLocale}
      emptyState={
        <div css={styles.welcomeContainer}>
          <h1 css={styles.welcomeTitle}>{t("title")}</h1>
          <p css={styles.welcomeDescription}>{t("description")}</p>
        </div>
      }
      typingIndicatorLabel={t("typingIndicator")}
      scrollToBottomLabel={t("scrollToBottom")}
      placeholder={t("placeholder")}
      sendLabel={t("sendLabel")}
      stopLabel={t("stopLabel")}
    />
  );
}

const styles = stylex.create({
  welcomeContainer: {
    textAlign: "center",
  },
  welcomeTitle: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_6,
    color: color.textMain,
    margin: 0,
    marginBottom: space._2,
  },
  welcomeDescription: {
    fontSize: font.uiBody,
    color: color.textMuted,
    margin: 0,
  },
});
