import { lazy, Suspense } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { CaretLeft, House, Airplane } from 'phosphor-react';
import { useTranslation } from '../contexts/translation';
import { getLocalePath, normalizePath } from '../utils/pathname';
import ThemeSwitch from './ThemeSwitch';
import LocaleSelector from './LocaleSelector';
import classes from './Layout.module.css';
import Footer from './Footer';
import Button from './Button';

const FlowGradient = lazy(() => import('./FlowGradient'));

interface LayoutProps {
  offlineReady?: boolean;
  onOfflineReadyClicked?: () => void;
}

function Layout({ offlineReady, onOfflineReadyClicked }: LayoutProps) {
  const { t, locale } = useTranslation({
    en: async () => (await import('./Layout-en')).default,
    zh: async () => (await import('./Layout-zh')).default,
  });
  const { pathname } = useLocation();
  const normalizedPathname = normalizePath(pathname);
  return (
    <>
      <div className={classes.flowGradient}>
        <Suspense fallback={<></>}>
          <FlowGradient />
        </Suspense>
      </div>
      <div className={classes.wrapper}>
        <div className={classes.wrapperInner}>
          <div className={classes.headerContainer}>
            <nav className={`${classes.wrapper} ${classes.header}`}>
              {offlineReady && (
                <Button onClick={onOfflineReadyClicked} type="button">
                  <Airplane />
                  <span className={classes.offlineText}>
                    {t('OFFLINE_READY')}
                  </span>
                </Button>
              )}
              <LocaleSelector />
              <ThemeSwitch />
            </nav>
          </div>
          <div className={`${classes.linesContainer} ${classes.wrapper}`}>
            <div className={classes.line} />
            <div className={classes.line} />
            <div className={classes.line} />
            <div className={classes.line} />
            <div className={classes.line} />
          </div>
          <main className={classes.main}>
            {normalizedPathname !== '/' && normalizedPathname !== '' && (
              <Link
                to={getLocalePath('/', locale)}
                className={classes.back}
                aria-label={t('BACK_LABEL')}
              >
                <CaretLeft weight="bold" />
                <House weight="bold" />
              </Link>
            )}
            <Outlet />
          </main>

          <Footer />
        </div>
      </div>
    </>
  );
}

export default Layout;
