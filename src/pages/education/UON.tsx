import { Helmet } from 'react-helmet-async';
import PageTitle from '../../components/PageTitle';
import { useTranslation } from '../../contexts/translation';

interface UniversityOfNottinghamProps {}

function UniversityOfNottingham(_props: UniversityOfNottinghamProps) {
  const { t } = useTranslation({
    en: async () => (await import('./UON-en')).default,
    zh: async () => (await import('./UON-zh')).default,
  });
  return (
    <>
      <Helmet>
        <title>{t('TITLE')}</title>
        <meta name="description" content={t('DESCRIPTION')} />
      </Helmet>
      <article>
        <PageTitle
          type="EDUCATION"
          title={t('UON')}
          role={t('COURSE')}
          date={t('DATE')}
        />
        <p>{t('GRADE')}</p>
        <p>{t('MODULES')}</p>
        <ul>
          <li>{t('DATA_STRUCTURES')}</li>
          <li>{t('ALGORITHMS')}</li>
          <li>{t('DATABASE')}</li>
          <li>{t('SECURITY')}</li>
          <li>{t('NETWORK')}</li>
        </ul>
        <p>{t('SOCIETY')}</p>
      </article>
    </>
  );
}

export default UniversityOfNottingham;
