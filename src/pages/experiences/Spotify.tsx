import PageTitle from '../../components/PageTitle';
import { useTranslation } from '../../contexts/translation';

interface ExperienceSpotifyProps {}

function ExperienceSpotify(_props: ExperienceSpotifyProps) {
  const { t } = useTranslation({
    en: async () => (await import('./Spotify-en')).default,
    zh: async () => (await import('./Spotify-zh')).default,
  });
  return (
    <article>
      <PageTitle
        type="EXPERIENCE"
        title="Spotify"
        role={t('ROLE')}
        date={t('DATE')}
      />
      <p>{t('MAIN_JOB')}</p>
      <p>{t('DEPENDABOT')}</p>
      <p>{t('COMPANY_WIDE')}</p>
      <p>{t('TECHNOLOGY_ADOPTION')}</p>
    </article>
  );
}

export default ExperienceSpotify;
