import { Helmet } from 'react-helmet-async';
import PageTitle from '../../components/PageTitle';
import { useTranslation } from '../../contexts/translation';

interface ExperienceWtcProps {}

function ExperienceWtc(_props: ExperienceWtcProps) {
  const { t } = useTranslation({
    en: async () => (await import('./Wtc-en')).default,
    zh: async () => (await import('./Wtc-zh')).default,
  });
  return (
    <>
      <Helmet>
        <title>{t('TITLE')}</title>
        <meta name="description" content={t('DESCRIPTION')} />
      </Helmet>
      <article>
        <PageTitle
          type="EXPERIENCE"
          title="Wunderman Thompson Commerce"
          role={t('ROLE')}
          date={t('DATE')}
        />
        <p>{t('MAIN_JOB')}</p>
        <ul>
          <li>React</li>
          <li>Redux</li>
          <li>Sass</li>
        </ul>
      </article>
    </>
  );
}

export default ExperienceWtc;
