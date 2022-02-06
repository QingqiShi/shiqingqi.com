import { Helmet } from 'react-helmet-async';
import PageTitle from '../../components/PageTitle';
import { useTranslation } from '../../contexts/translation';

interface AGSBProps {}

function AGSB(_props: AGSBProps) {
  const { t } = useTranslation({
    en: async () => (await import('./AGSB-en')).default,
    zh: async () => (await import('./AGSB-zh')).default,
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
          title={t('AGSB')}
          role={t('COURSE')}
          date={t('DATE')}
        />
        <p>{t('GRADE')}</p>
        <p>{t('MODULES')}</p>
        <ul>
          <li>{t('COMPUTING')}</li>
          <li>{t('MATHEMATICS')}</li>
          <li>{t('CHINESE')}</li>
          <li>{t('PHYSICS')}</li>
        </ul>
      </article>
    </>
  );
}

export default AGSB;
