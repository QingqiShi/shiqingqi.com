import { DetailPageTitle } from "#src/components/home/detail-page-title.tsx";
import { t } from "#src/i18n.ts";

export default function Page() {
  return (
    <>
      <DetailPageTitle
        type="experience"
        title="Citadel"
        role={t({ en: "Software Engineer", zh: "软件工程师" })}
        date={t({ en: "Aug 2021 - Now", zh: "2021年8月 至今" })}
      />
      <p>
        {t({
          en: "At Citadel, I work as a software engineer, focusing on developing dashboard web applications that provide interactive data insights for traders and management. These applications enable better decision-making and help improve daily work processes in the financial sector. As my first experience in the finance industry, I've taken the opportunity to broaden my knowledge in this domain.",
          zh: "在 Citadel，我担任软件工程师，专注于开发仪表盘 Web 应用，为交易员和管理层提供交互式数据洞察。这些应用有助于更好的决策，并帮助金融行业改进日常工作流程。作为我在金融行业的第一次经历，我借此机会扩展了我在这个领域的知识。",
        })}
      </p>
      <p>
        {t({
          en: "My expertise lies in front-end technologies, and I primarily work with the following tools",
          zh: "我专攻前端技术，并主要使用以下工具：",
        })}
      </p>
      <ul>
        <li>React</li>
        <li>TypeScript</li>
        <li>AG Grid</li>
      </ul>
    </>
  );
}
