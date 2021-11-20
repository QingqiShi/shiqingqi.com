import { useTranslation } from '../contexts/translation';
import classes from './Footer.module.css';

interface FooterProps {}

function Footer(_props: FooterProps) {
  const { t } = useTranslation({
    en: async () => (await import('./Footer-en')).default,
    zh: async () => (await import('./Footer-zh')).default,
  });
  return (
    <footer className={classes.container}>
      <div>
        <div>
          <a href="#top" target="_blank" className={classes.socialLink}>
            Github
          </a>
          <a href="#top" target="_blank" className={classes.socialLink}>
            LinkedIn
          </a>
        </div>
      </div>
      <div>
        <div>
          <div className={classes.name}>{t('TITLE')}</div>
          <div className={classes.copyRight}>© {new Date().getFullYear()}</div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
