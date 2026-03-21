import * as stylex from "@stylexjs/stylex";
import { border, color, font, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { ChatInputSection } from "./chat-input-section";
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
    <>
      <div css={styles.messagesArea}>
        <div css={styles.welcomeContainer}>
          <h1 css={styles.welcomeTitle}>{t("title")}</h1>
          <p css={styles.welcomeDescription}>{t("description")}</p>
        </div>
      </div>
      <div css={styles.inputArea}>
        <ChatInputSection
          placeholder={t("placeholder")}
          sendLabel={t("sendLabel")}
          stopLabel={t("stopLabel")}
        />
      </div>
    </>
  );
}

const styles = stylex.create({
  messagesArea: {
    flexGrow: 1,
    overflowY: "auto",
    padding: space._3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
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
  inputArea: {
    flexShrink: 0,
    padding: space._3,
    paddingBottom: `calc(${space._3} + env(safe-area-inset-bottom))`,
    borderTopWidth: border.size_1,
    borderTopStyle: "solid",
    borderTopColor: color.controlTrack,
  },
});
