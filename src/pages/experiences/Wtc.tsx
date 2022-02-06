import PageTitle from '../../components/PageTitle';
import { useTranslation } from '../../contexts/translation';

interface ExperienceWtcProps {}

function ExperienceWtc(_props: ExperienceWtcProps) {
  const { t } = useTranslation({
    en: async () => (await import('./Wtc-en')).default,
    zh: async () => (await import('./Wtc-zh')).default,
  });
  return (
    <article>
      <PageTitle
        type="EXPERIENCE"
        title="Wunderman Thompson Commerce"
        role={t('ROLE')}
        date={t('DATE')}
      />
      <p>{t('MAIN_JOB')}</p>
      <p>{t('REDESIGN_PROJECT')}</p>
      <p>{t('DIFFERENT_TEAMS')}</p>
      <p>{t('TECH_STACK')}</p>
    </article>
  );
}

export default ExperienceWtc;
