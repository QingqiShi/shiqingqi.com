import { t } from "@tuja/i18n";
import type { PageProps } from "@tuja/i18n/types";
import { validateLocale } from "@tuja/i18n/validate-locale";
import { Text } from "@tuja/ui/components/text";
import type { Metadata } from "next";
import { publicPageMetadata } from "#src/landing/public-page-metadata.ts";
import { LegalPage, LegalSection } from "#src/legal/legal-page.tsx";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const locale = validateLocale((await props.params).locale);
  return {
    title: t({ en: "Terms and privacy", zh: "服务条款和隐私政策" }),
    description: t({
      en: "The terms of Trips, what it keeps about you, and who else gets it.",
      zh: "旅行计划的服务条款、它保存你的哪些信息，以及还有谁会拿到这些信息。",
    }),
    ...publicPageMetadata("/terms", locale),
  };
}

export default function Page() {
  return (
    <LegalPage
      title={t({ en: "Terms and privacy", zh: "服务条款和隐私政策" })}
      updated={t({
        en: "Last changed on 17 November 2026.",
        zh: "最后更新于 2026 年 11 月 17 日。",
      })}
    >
      <LegalSection title={t({ en: "Terms", zh: "服务条款" })}>
        <Text as="p">
          {t({
            en: "Trips is a personal project, run by the owner of qingqi.dev. It costs nothing, and it can change or stop.",
            zh: "旅行计划是一个个人项目，由 qingqi.dev 的主人运营。它不收费，也可能改变或停止。",
          })}
        </Text>
        <Text as="p">
          {t({
            en: "A trip shows only to its members, and its owners add people with invite links. Put in a trip only what you are happy for its members to read.",
            zh: "行程只对它的成员可见，所有者通过邀请链接把人加进来。只在行程里写你愿意让成员看到的内容。",
          })}
        </Text>
        <Text as="p">
          {t({
            en: "A plan is a guide. Check times and prices with the places themselves.",
            zh: "行程仅供参考。时间和价格请以各地官方信息为准。",
          })}
        </Text>
      </LegalSection>
      <LegalSection title={t({ en: "Privacy", zh: "隐私政策" })}>
        <Text as="p">
          {t({
            en: "Trips keeps your email address, the public key of each passkey, and a record of each device that you sign in on, with the name that its browser gives. The owners of a trip that you join see your email address.",
            zh: "旅行计划保存你的邮箱地址、每个通行密钥的公钥，以及你登录的每台设备的记录和该设备浏览器报出的名称。你加入的行程的所有者能看到你的邮箱地址。",
          })}
        </Text>
        <Text as="p">
          {t({
            en: "Vercel hosts the site and counts the pages that are opened. Neon holds the database. Resend sends the emails with your codes. Upstash counts requests by IP address and by a hash of your email address, to limit them. Maps come from Google Maps, and the weather from Open-Meteo.",
            zh: "Vercel 托管网站并统计被打开的页面。Neon 存放数据库。Resend 发送带验证码的邮件。Upstash 按 IP 地址和邮箱地址的哈希值统计请求次数，以限制请求频率。地图来自 Google 地图，天气来自 Open-Meteo。",
          })}
        </Text>
        <Text as="p">
          {t({
            en: "Cookies keep you signed in and remember your language and layout.",
            zh: "Cookie 用于保持登录，并记住你的语言和布局。",
          })}
        </Text>
        <Text as="p">
          {t({
            en: "To remove your data, delete your account in Settings.",
            zh: "如需删除你的数据，请在“设置”中删除账号。",
          })}
        </Text>
      </LegalSection>
    </LegalPage>
  );
}
