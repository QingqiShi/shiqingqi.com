import { DetailPageTitle } from "#src/components/home/detail-page-title.tsx";
import { t } from "#src/i18n.ts";

export default function Page() {
  return (
    <>
      <DetailPageTitle
        type="experience"
        title="Wunderman Thompson Commerce"
        role={t({ en: "Front End Developer", zh: "前端开发员" })}
        date={t({ en: "Sep 2017 - Jul 2019", zh: "2017年9月 - 2019年7月" })}
      />
      <p>
        {t({
          en: "At Wunderman Thompson Commerce, I played a crucial role in improving three high-traffic e-commerce websites for a variety of clients. My work in re-platforming and redesigning projects contributed to increased conversion rates. I seamlessly integrated with multiple scrum teams and even took on the responsibility of a front-end tech lead at one point. My primary tech stack during this time included:",
          zh: "在 Wunderman Thompson Commerce，我在改进三个高流量电子商务网站方面发挥了关键作用，这些网站服务于不同的客户。我的重平台和重新设计项目工作有助于提高转化率。我与多个敏捷团队无缝合作，甚至在某个时候担任了前端技术负责人的职责。那时我主要使用的技术栈包括：",
        })}
      </p>
      <ul>
        <li>React</li>
        <li>Redux</li>
        <li>Sass</li>
      </ul>
    </>
  );
}
