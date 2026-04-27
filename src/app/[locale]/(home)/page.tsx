import { CalculatorIcon } from "@phosphor-icons/react/dist/ssr/Calculator";
import { FilmSlateIcon } from "@phosphor-icons/react/dist/ssr/FilmSlate";
import { GraduationCapIcon } from "@phosphor-icons/react/dist/ssr/GraduationCap";
import { PackageIcon } from "@phosphor-icons/react/dist/ssr/Package";
import * as stylex from "@stylexjs/stylex";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { EducationCard } from "#src/components/home/education-card.tsx";
import { ExperienceCard } from "#src/components/home/experience-card.tsx";
import { ProjectCard } from "#src/components/home/project-card.tsx";
import { t } from "#src/i18n.ts";
import AGSB from "#src/logos/AGSB.webp";
import BristolLogo from "#src/logos/bristol-logo.tsx";
import CitadelLogo from "#src/logos/citadel-logo.tsx";
import NottinghamLogo from "#src/logos/nottingham-logo.tsx";
import SpotifyLogo from "#src/logos/spotify-logo.tsx";
import { svgTokens } from "#src/logos/svg.stylex.ts";
import WtcLogo from "#src/logos/wtc-logo.tsx";
import { color, font, space } from "#src/tokens.stylex.ts";
import type { PageProps } from "#src/types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";

export default async function Home(props: PageProps) {
  const { locale } = await props.params;
  return (
    <>
      <section css={styles.heroContainer}>
        <h1 css={styles.display}>
          {t({ en: "Hi, I'm Qingqi.", zh: "嗨，我叫石清琪。" })}
          <br />
          {t({
            en: "I'm a software engineer.",
            zh: "我是一名软件工程师。",
          })}
        </h1>
        <p css={styles.brief}>
          {t(
            {
              en: "Embracing the <strong>craftsman's spirit</strong>, I pursue <strong>perfection</strong>, <strong>precision</strong> and <strong>patience</strong> in software engineering and all aspects of life.",
              zh: "我信奉<strong>工匠精神</strong>。工匠用他们<strong>敬业</strong>、<strong>专注</strong>和<strong>精益求精</strong>的精神雕琢产品。无论是工作还是生活，我都这样要求自己。",
            },
            { parse: true },
          )}
        </p>
      </section>

      <section>
        <h2 css={styles.sectionTitle}>{t({ en: "Projects", zh: "项目" })}</h2>
        <div css={styles.cardList}>
          <ProjectCard
            icon={
              <GraduationCapIcon size={64} weight="fill" aria-hidden="true" />
            }
            href="https://studentloanstudy.uk/"
            target="_blank"
            css={[styles.card, styles.studentLoan]}
            name={t({ en: "Student Loan Calculator", zh: "学生贷款计算器" })}
            description={t({
              en: "Calculate and understand your student loan.",
              zh: "计算和了解您的学生贷款。",
            })}
          />
          <ProjectCard
            icon={<FilmSlateIcon size={64} weight="fill" aria-hidden="true" />}
            href={getLocalePath("/movie-database", locale)}
            css={[styles.card, styles.movieDatabase]}
            name={t({ en: "Movie Database", zh: "电影数据库" })}
            description={t({
              en: "Chat with AI to find your next watch, or browse what's trending.",
              zh: "让 AI 帮你找下一部佳片，或浏览当下热门。",
            })}
            scroll
          />
          <ProjectCard
            icon={<CalculatorIcon size={64} weight="fill" aria-hidden="true" />}
            href={getLocalePath("/calculator", locale)}
            css={[styles.card, styles.calculator]}
            name={t({ en: "Calculator", zh: "计算器" })}
            description={t({
              en: "A simple calculator demo.",
              zh: "一个简单的计算器演示",
            })}
            scroll
          />
          <ProjectCard
            icon={<PackageIcon size={64} weight="fill" aria-hidden="true" />}
            href={getLocalePath("/design-system", locale)}
            css={[styles.card, styles.designSystem]}
            name={t({ en: "Design System", zh: "设计系统" })}
            description={t({
              en: "A refined visual language, crafted with care.",
              zh: "精心打造的精致视觉语言。",
            })}
            scroll
          />
        </div>
      </section>

      <section>
        <h2 css={styles.sectionTitle}>
          {t({ en: "Professional Experiences", zh: "职业经历" })}
        </h2>
        <div css={styles.cardList}>
          <ExperienceCard
            logo={<CitadelLogo />}
            dates={t({ en: "Aug 2021 - Now", zh: "2021年8月 至今" })}
            dateTime="2021-08"
            href={getLocalePath("/experiences/citadel", locale)}
            css={styles.card}
            aria-label={t({
              en: "Citadel August 2021 to now, click to view details",
              zh: "Citadel (城堡投资) 2021年8月至今，点击查看详情",
            })}
            scroll
          />
          <ExperienceCard
            logo={<SpotifyLogo />}
            dates={t({
              en: "Jul 2019 - Aug 2021",
              zh: "2019年7月 - 2021年8月",
            })}
            dateTime="2019-07"
            href={getLocalePath("/experiences/spotify", locale)}
            css={styles.card}
            aria-label={t({
              en: "Spotify July 2019 to August 2021, click to view details",
              zh: "Spotify 2019年7月至2021年8月，点击查看详情",
            })}
          />
          <ExperienceCard
            logo={<WtcLogo />}
            dates={t({
              en: "Sep 2017 - Jul 2019",
              zh: "2017年9月 - 2019年7月",
            })}
            dateTime="2017-09"
            href={getLocalePath(
              "/experiences/wunderman-thompson-commerce",
              locale,
            )}
            css={styles.card}
            aria-label={t({
              en: "Wunderman Thompson Commerce September 2017 to July 2019, click to view details",
              zh: "Wunderman Thompson Commerce 2017年9月至2019年7月，点击查看详情",
            })}
          />
        </div>
      </section>
      <section>
        <h2 css={styles.sectionTitle}>{t({ en: "Education", zh: "教育" })}</h2>
        <div css={styles.cardList}>
          <EducationCard
            logo={
              <BristolLogo
                title={t({ en: "University of Bristol", zh: "布里斯托大学" })}
              />
            }
            name={t({ en: "University of Bristol", zh: "布里斯托大学" })}
            dates={t({
              en: "Sep 2016 - Jan 2018",
              zh: "2016年9月 - 2018年1月",
            })}
            dateTime="2016-09"
            href={getLocalePath("/education/university-of-bristol", locale)}
            css={styles.card}
          />
          <EducationCard
            logo={
              <NottinghamLogo
                title={t({
                  en: "University of Nottingham",
                  zh: "诺丁汉大学",
                })}
              />
            }
            name={t({ en: "University of Nottingham", zh: "诺丁汉大学" })}
            dates={t({
              en: "Sep 2013 - Jul 2016",
              zh: "2013年9月 - 2016年7月",
            })}
            dateTime="2013-09"
            href={getLocalePath("/education/university-of-nottingham", locale)}
            css={styles.card}
          />
          <EducationCard
            logo={{
              src: AGSB,
              alt: t({ en: "Altrincham", zh: "奥尔特灵厄姆" }),
            }}
            name={t({ en: "Altrincham", zh: "奥尔特灵厄姆" })}
            nameSubText={t({
              en: "Grammar School for Boys",
              zh: "文法男校",
            })}
            dates={t({
              en: "Sep 2011 - Jul 2013",
              zh: "2011年9月 - 2013年7月",
            })}
            dateTime="2011-09"
            href={getLocalePath(
              "/education/altrincham-grammar-school-for-boys",
              locale,
            )}
            css={styles.card}
          />
        </div>
      </section>
    </>
  );
}

const styles = stylex.create({
  heroContainer: {
    paddingBlockStart: `clamp(${space._12}, 30dvh, ${space._14})`,
    paddingBlockEnd: {
      default: space._7,
      [breakpoints.sm]: space._9,
    },
  },
  display: {
    margin: `0 0 ${space._3} 0`,
    fontSize: font.vpDisplay,
    fontWeight: font.weight_8,
  },
  brief: {
    margin: 0,
    fontSize: font.vpSubDisplay,
  },
  sectionTitle: {
    marginTop: space._7,
    marginBottom: space._3,
    fontSize: font.vpHeading2,
    fontWeight: font.weight_7,
  },
  cardList: {
    display: "flex",
    flexWrap: "wrap",
  },
  card: {
    width: {
      default: "100%",
      [breakpoints.sm]: "50%",
      [breakpoints.md]: "33.3%",
      [breakpoints.lg]: "25%",
    },
  },
  movieDatabase: {
    [svgTokens.fill]: color.brandTmdb,
  },
  designSystem: {
    [svgTokens.fill]: color.controlActive,
  },
  calculator: {
    [svgTokens.fill]: color.brandCalculator,
  },
  studentLoan: {
    [svgTokens.fill]: color.brandStudentLoan,
  },
});
