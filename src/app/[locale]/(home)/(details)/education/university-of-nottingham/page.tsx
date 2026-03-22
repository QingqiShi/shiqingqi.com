import { DetailPageTitle } from "#src/components/home/detail-page-title.tsx";
import { t } from "#src/i18n.ts";

export default function Page() {
  return (
    <>
      <DetailPageTitle
        type="education"
        title={t({ en: "University of Nottingham", zh: "诺丁汉大学" })}
        role={t({
          en: "BSc Hons Computer Science",
          zh: "荣誉理学学士 - 计算机科学",
        })}
        date={t({ en: "Sep 2013 - Jul 2016", zh: "2013年9月 - 2016年7月" })}
      />
      <p>
        {t({ en: "Grade: First-class Honours", zh: "学位等级：一等荣誉学位" })}
      </p>
      <p>{t({ en: "Core Courses:", zh: "核心科目：" })}</p>
      <ul>
        <li>{t({ en: "Data Structures", zh: "数据结构" })}</li>
        <li>{t({ en: "Algorithms", zh: "算法" })}</li>
        <li>{t({ en: "Database", zh: "数据库" })}</li>
        <li>{t({ en: "Security", zh: "信息安全" })}</li>
        <li>{t({ en: "Network", zh: "网络" })}</li>
      </ul>
      <p>
        {t({
          en: "Extra: Chinese Students and Scholars Association, IT Officer",
          zh: "社团：中国学生学者联谊会 IT 部长",
        })}
      </p>
    </>
  );
}
