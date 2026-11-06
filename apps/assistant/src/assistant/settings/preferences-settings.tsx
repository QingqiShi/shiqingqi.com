"use client";

import { DesktopIcon } from "@phosphor-icons/react/dist/ssr/Desktop";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import * as stylex from "@stylexjs/stylex";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { setLocaleCookie } from "@tuja/i18n/set-locale-cookie";
import { useLocale } from "@tuja/i18n/use-locale";
import { OptionCardGroup } from "@tuja/ui/components/option-card-group";
import { Text } from "@tuja/ui/components/text";
import { useTheme } from "@tuja/ui/hooks/use-theme";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { typeRole } from "@tuja/ui/primitives/type.stylex";
import { font, measure } from "@tuja/ui/tokens.stylex";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { SettingsSection } from "./settings-section.tsx";

/** The Language and Theme this device shows Qi Assistant in. */
export function PreferencesSettings() {
  const locale = useLocale();
  const pathname = usePathname();
  const [theme, setTheme] = useTheme();
  const languageId = useId();
  const themeId = useId();

  return (
    <SettingsSection
      level={2}
      title={t({ en: "Preferences", zh: "偏好设置" })}
      description={t({
        en: "These apply to this device only.",
        zh: "这些设置只对本设备生效。",
      })}
    >
      <div css={stack.tight}>
        <Text id={languageId} look="label">
          {t({ en: "Language", zh: "语言" })}
        </Text>
        <OptionCardGroup
          look="tile"
          css={styles.tiles}
          aria-labelledby={languageId}
          options={[
            {
              value: "en",
              label: <span lang="en">English</span>,
              icon: <ScriptGlyph lang="en">Aa</ScriptGlyph>,
            },
            {
              value: "zh",
              label: <span lang="zh">中文</span>,
              icon: <ScriptGlyph lang="zh">文</ScriptGlyph>,
            },
          ]}
          value={locale}
          onChange={(next) => {
            if (next === locale) return;
            setLocaleCookie(next);
            window.location.assign(getLocalePath(pathname, next));
          }}
        />
      </div>
      <div css={stack.tight}>
        <Text id={themeId} look="label">
          {t({ en: "Theme", zh: "主题" })}
        </Text>
        <OptionCardGroup
          look="tile"
          css={styles.tiles}
          aria-labelledby={themeId}
          options={[
            {
              value: "system",
              label: t({ en: "System", zh: "跟随系统" }),
              icon: <DesktopIcon weight="bold" />,
            },
            {
              value: "light",
              label: t({ en: "Light", zh: "浅色" }),
              icon: <SunIcon weight="bold" />,
            },
            {
              value: "dark",
              label: t({ en: "Dark", zh: "深色" }),
              icon: <MoonIcon weight="bold" />,
            },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </div>
    </SettingsSection>
  );
}

function ScriptGlyph({ lang, children }: { lang: string; children: string }) {
  return (
    <span lang={lang} css={[typeRole.body, styles.glyph]}>
      {children}
    </span>
  );
}

const styles = stylex.create({
  // Language has two options, but it uses the same three columns as Theme.
  // Thus the tiles of the two groups align, and Theme does not wrap on a phone.
  tiles: {
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    maxInlineSize: measure.form,
  },
  glyph: {
    lineHeight: font.lineHeight_0,
  },
});
