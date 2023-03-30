import { Helmet } from 'react-helmet-async';
import PageTitle from '../../components/PageTitle';
import { useTranslation } from '../../contexts/translation';

interface ExperienceSpotifyProps {}

function ExperienceSpotify(_props: ExperienceSpotifyProps) {
  const { t } = useTranslation({
    en: async () => (await import('./Spotify-en')).default,
    zh: async () => (await import('./Spotify-zh')).default,
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
          title="Spotify"
          role={t('ROLE')}
          date={t('DATE')}
        />
        <p>{t('MAIN_JOB')}</p>
        <p>{t('DEPENDABOT')}</p>
        <p>{t('COMPANY_WIDE')}</p>
      </article>
    </>
  );
}

export default ExperienceSpotify;
