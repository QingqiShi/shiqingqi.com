import { Helmet } from 'react-helmet-async';
import { useTranslation } from '../contexts/translation';

interface NotFoundProps {}

function NotFound(_props: NotFoundProps) {
  const { t } = useTranslation({
    en: async () => (await import('./NotFound-en')).default,
    zh: async () => (await import('./NotFound-zh')).default,
  });
  return (
    <>
      <Helmet>
        <title>{t('TITLE')}</title>
        <meta name="description" content={t('DESCRIPTION')} />
      </Helmet>
      <div>
        <h1>404</h1>
        <p>{t('NOT_FOUND')}</p>
      </div>
    </>
  );
}

export default NotFound;
