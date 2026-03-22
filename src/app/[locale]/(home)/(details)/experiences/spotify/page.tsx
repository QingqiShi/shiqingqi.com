import { DetailPageTitle } from "#src/components/home/detail-page-title.tsx";
import { t } from "#src/i18n.ts";

export default function Page() {
  return (
    <>
      <DetailPageTitle
        type="experience"
        title="Spotify"
        role={t({ en: "Software Engineer II", zh: "软件工程师 II" })}
        date={t({ en: "Jul 2019 - Aug 2021", zh: "2019年7月 - 2021年8月" })}
      />
      <p>
        {t({
          en: "During my time at Spotify, I built the frontend of their campaign management platform from scratch, using React, TypeScript, and GraphQL. This platform allowed operators and developers to efficiently deliver ad campaigns across multiple surfaces, driving global premium growth.",
          zh: "在 Spotify 工作期间，我从零开始构建了他们的广告活动管理平台的前端，使用 React、TypeScript 和 GraphQL。这个平台让运营人员和开发人员能够在多个平台上高效地发布广告活动，推动全球增长。",
        })}
      </p>
      <p>
        {t({
          en: 'I also led the design and development of "spotify-dependabot" during Hack Week, which streamlined dependency management for over 1000 internal projects.',
          zh: '此外，我还在黑客周期间领导了 "spotify-dependabot" 的设计和开发，为超过 1000 个内部项目简化了依赖管理。',
        })}
      </p>
      <p>
        {t({
          en: "Furthermore, I contributed to company-wide initiatives, such as the Encore component library and the Web Enrichment Platform infrastructure, while promoting the adoption of cutting-edge technologies.",
          zh: "我还为公司范围内的一些项目做出了贡献，如 Encore 组件库和 Web Enrichment Platform 基础设施，并推动了前沿技术的采用。",
        })}
      </p>
    </>
  );
}
