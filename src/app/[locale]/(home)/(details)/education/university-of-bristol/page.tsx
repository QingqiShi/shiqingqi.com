import { DetailPageTitle } from "#src/components/home/detail-page-title.tsx";
import { Anchor } from "#src/components/shared/anchor.tsx";
import { t } from "#src/i18n.ts";

export default function Page() {
  return (
    <>
      <DetailPageTitle
        type="education"
        title={t({ en: "University of Bristol", zh: "布里斯托大学" })}
        role={t({
          en: "MSc Advanced Computing - Creative Technology",
          zh: "理学硕士 - 高级计算机 创新技术",
        })}
        date={t({ en: "Sep 2016 - Jan 2018", zh: "2016年9月 - 2018年1月" })}
      />
      <p>{t({ en: "Grade: Merit", zh: "学位等级：优等" })}</p>
      <p>{t({ en: "Core Courses:", zh: "核心科目：" })}</p>
      <ul>
        <li>{t({ en: "Web Development", zh: "网络开发" })}</li>
        <li>{t({ en: "Graphics", zh: "图形学" })}</li>
        <li>{t({ en: "Animation", zh: "动画" })}</li>
        <li>{t({ en: "Robotics", zh: "机械" })}</li>
      </ul>
      <p>{t({ en: "Example Projects:", zh: "项目:" })}</p>
      <ul>
        <li>
          <Anchor
            href="https://github.com/QingqiShi/Game-of-Life-Website"
            target="_blank"
          >
            Game of Life website
          </Anchor>
        </li>
        <li>
          <Anchor
            href="https://github.com/QingqiShi/Ray-Tracer"
            target="_blank"
          >
            Ray Tracer
          </Anchor>
        </li>
      </ul>
    </>
  );
}
