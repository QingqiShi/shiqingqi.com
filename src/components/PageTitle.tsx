import { useTranslation } from '../contexts/translation';
import classes from './PageTitle.module.css';

interface PageTitleProps {
  type: 'EXPERIENCE' | 'EDUCATION';
  title: string;
  role: string;
  date: string;
}

function PageTitle({ type, title, role, date }: PageTitleProps) {
  const { t } = useTranslation({
    en: async () => (await import('./PageTitle-en')).default,
    zh: async () => (await import('./PageTitle-zh')).default,
  });
  return (
    <div className={classes.titleContainer}>
      <div className={classes.subtitle}>
        {t(type)} - {title}
      </div>
      <h1>{role}</h1>
      <time className={classes.dates}>{date}</time>
    </div>
  );
}

export default PageTitle;
