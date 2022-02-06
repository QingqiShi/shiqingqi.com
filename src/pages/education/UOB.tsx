import PageTitle from '../../components/PageTitle';
import { useTranslation } from '../../contexts/translation';

interface UniversityOfBristolProps {}

function UniversityOfBristol(_props: UniversityOfBristolProps) {
  const { t } = useTranslation({
    en: async () => (await import('./UOB-en')).default,
    zh: async () => (await import('./UOB-zh')).default,
  });
  return (
    <article>
      <PageTitle
        type="EDUCATION"
        title={t('UOB')}
        role={t('COURSE')}
        date={t('DATE')}
      />
      <p>{t('GRADE')}</p>
      <p>{t('MODULES')}</p>
      <ul>
        <li>{t('WEB_DEVELOPMENT')}</li>
        <li>{t('GRAPHICS')}</li>
        <li>{t('ANIMATION')}</li>
        <li>{t('ROBOTICS')}</li>
      </ul>
      <p>{t('EXAMPLE_PROJECTS')}</p>
      <ul>
        <li>
          <a href="https://github.com/QingqiShi/Game-of-Life-Website">
            Game of Life website
          </a>
        </li>
        <li>
          <a href="https://github.com/QingqiShi/Ray-Tracer">Ray Tracer</a>
        </li>
      </ul>
    </article>
  );
}

export default UniversityOfBristol;
