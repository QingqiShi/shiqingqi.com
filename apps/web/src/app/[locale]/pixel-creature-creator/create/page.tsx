import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { WizardShell } from "#src/components/pixel-creature-creator/wizard/wizard-shell.tsx";
import { BASE_URL } from "#src/constants.ts";
import { t } from "#src/i18n.ts";
import type { PageProps } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);
  const title = t({
    en: "Create your creature | Qingqi Shi",
    zh: "创建你的生物 | 石清琪",
  });
  const description = t({
    en: "Pixel Creature Creator — pick a body, head, eyes, accessories, palette and vibe to design your own creature.",
    zh: "像素生物创造器 —— 选择身体、头部、眼睛、饰品、色板和情绪,设计属于你的生物。",
  });
  const url =
    params.locale === "zh"
      ? new URL("/zh/pixel-creature-creator/create", BASE_URL).toString()
      : new URL("/pixel-creature-creator/create", BASE_URL).toString();
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: {
        en: new URL("/pixel-creature-creator/create", BASE_URL).toString(),
        zh: new URL("/zh/pixel-creature-creator/create", BASE_URL).toString(),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: t({ en: "Qingqi Shi", zh: "石清琪" }),
      locale: params.locale === "zh" ? "zh_CN" : "en_US",
      type: "website",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  } satisfies Metadata;
}

export default function Page() {
  return (
    <>
      <h1 css={styles.srOnly}>
        {t({ en: "Create your creature", zh: "创建你的生物" })}
      </h1>
      <WizardShell />
    </>
  );
}

const styles = stylex.create({
  srOnly: {
    position: "absolute",
    width: "1px",
    height: "1px",
    padding: 0,
    margin: "-1px",
    overflow: "hidden",
    clipPath: "inset(50%)",
    whiteSpace: "nowrap",
    borderWidth: 0,
  },
});
