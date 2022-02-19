import { useTranslation } from '../contexts/translation';
import classes from './Footer.module.css';

interface FooterProps {}

function Footer(_props: FooterProps) {
  const { t, locale } = useTranslation({
    en: async () => (await import('./Footer-en')).default,
    zh: async () => (await import('./Footer-zh')).default,
  });
  return (
    <footer className={classes.container}>
      <div>
        <div>
          <a
            className={classes.socialLink}
            href="https://github.com/QingqiShi"
            target="_blank"
            rel="nofollow me noopener noreferrer"
          >
            Github
          </a>
          <a
            className={classes.socialLink}
            href={
              locale === 'zh'
                ? 'https://www.linkedin.com/in/qingqi-shi/?locale=zh_CN'
                : 'https://www.linkedin.com/in/qingqi-shi/'
            }
            target="_blank"
            rel="nofollow me noopener noreferrer"
          >
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
