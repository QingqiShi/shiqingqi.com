"use client";

import { DesktopIcon } from "@phosphor-icons/react/dist/ssr/Desktop";
import { MoonIcon } from "@phosphor-icons/react/dist/ssr/Moon";
import { SunIcon } from "@phosphor-icons/react/dist/ssr/Sun";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { setLocaleCookie } from "@tuja/i18n/set-locale-cookie";
import { useLocale } from "@tuja/i18n/use-locale";
import { SegmentedControl } from "@tuja/ui/components/segmented-control";
import { Text } from "@tuja/ui/components/text";
import { align } from "@tuja/ui/primitives/flex.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { usePathname } from "next/navigation";
import { useId } from "react";
import { useTheme } from "#src/theme/use-theme.ts";
import { SettingsPanel } from "./settings-panel.tsx";

/** The Language and Theme this device shows Finance in. */
export function PreferencesSettings() {
  const locale = useLocale();
  const pathname = usePathname();
  const [theme, setTheme] = useTheme();
  const languageId = useId();
  const themeId = useId();

  return (
    <SettingsPanel
      title={t({ en: "Preferences", zh: "偏好设置" })}
      description={t({
        en: "These apply to this device only.",
        zh: "这些设置只对本设备生效。",
      })}
    >
      <div css={[stack.tight, align.start]}>
        <Text id={languageId} look="label">
          {t({ en: "Language", zh: "语言" })}
        </Text>
        <SegmentedControl
          aria-labelledby={languageId}
          options={[
            { value: "en", label: <span lang="en">English</span> },
            { value: "zh", label: <span lang="zh">中文</span> },
          ]}
          value={locale}
          onChange={(next) => {
            if (next === locale) return;
            setLocaleCookie(next);
            window.location.assign(getLocalePath(pathname, next));
          }}
        />
      </div>
      <div css={[stack.tight, align.start]}>
        <Text id={themeId} look="label">
          {t({ en: "Theme", zh: "主题" })}
        </Text>
        <SegmentedControl
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
    </SettingsPanel>
  );
}
