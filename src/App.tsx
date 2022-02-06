import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { useRegisterSW } from 'virtual:pwa-register/react';
import Layout from './components/Layout';
import { ThemeProvider } from './contexts/theme';
import { TranslationProvider, useTranslation } from './contexts/translation';
import { cononicalOrigin, getFullPath, isKnownPath } from './utils/pathname';
import { routes } from './utils/routes';
import classes from './App.module.css';

const Home = lazy(() => import('./pages/Home'));
const ExperienceCitadel = lazy(() => import('./pages/experiences/Citadel'));
const ExperienceSpotify = lazy(() => import('./pages/experiences/Spotify'));
const ExperienceWtc = lazy(() => import('./pages/experiences/Wtc'));
const EducationUOB = lazy(() => import('./pages/education/UOB'));
const EducationUON = lazy(() => import('./pages/education/UON'));
const EducationAGSB = lazy(() => import('./pages/education/AGSB'));
const NotFound = lazy(() => import('./pages/NotFound'));

function App() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
  } = useRegisterSW({});
  return (
    <BrowserRouter>
      <HelmetProvider>
        <TranslationProvider>
          <ThemeProvider>
            <Routes>
              <Route
                element={
                  <Layout
                    offlineReady={offlineReady}
                    onOfflineReadyClicked={() => setOfflineReady(false)}
                  />
                }
              >
                <Route path="/*" element={<LocalisedRoutes locale="en" />} />
                <Route path="/zh/*" element={<LocalisedRoutes locale="zh" />} />
              </Route>
            </Routes>
          </ThemeProvider>
        </TranslationProvider>
      </HelmetProvider>
    </BrowserRouter>
  );
}

interface LocalisedRoutesProps {
  locale: string;
}

function LocalisedRoutes({ locale }: LocalisedRoutesProps) {
  const { setLocale } = useTranslation();
  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);

  const location = useLocation();

  // page_view events
  const firstLoadRef = useRef(true);
  useEffect(() => {
    const logPageViewEvent = async () => {
      const { getAnalytics, logEvent } = await import('firebase/analytics');
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        return;
      }

      const analyticsInstance = getAnalytics();
      logEvent(analyticsInstance, 'page_view');
    };

    if (window.location.origin === cononicalOrigin) {
      logPageViewEvent();
    }
  }, [location.pathname]);

  return (
    <>
      <Helmet htmlAttributes={{ lang: locale }}>
        {isKnownPath(location.pathname) ? (
          <>
            <link
              rel="alternate"
              hrefLang="en"
              href={getFullPath(location.pathname, 'en')}
            />
            <link
              rel="alternate"
              hrefLang="zh"
              href={getFullPath(location.pathname, 'zh')}
            />
            <link rel="canonical" href={getFullPath(location.pathname, 'en')} />
          </>
        ) : (
          <>
            <link
              rel="alternate"
              hrefLang="en"
              href={getFullPath(location.pathname, 'en')}
            />
            <link
              rel="alternate"
              hrefLang="zh"
              href={getFullPath(location.pathname, 'zh')}
            />
            <link rel="canonical" href={getFullPath('/404', 'en')} />
          </>
        )}
      </Helmet>
      <Routes>
        <Route
          path={routes.home}
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <Home />
            </Suspense>
          }
        />

        <Route
          path={routes.experienceCitadel}
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <ExperienceCitadel />
            </Suspense>
          }
        />
        <Route
          path={routes.experienceSpotify}
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <ExperienceSpotify />
            </Suspense>
          }
        />
        <Route
          path={routes.experienceWtc}
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <ExperienceWtc />
            </Suspense>
          }
        />

        <Route
          path={routes.educationUOB}
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <EducationUOB />
            </Suspense>
          }
        />
        <Route
          path={routes.educationUON}
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <EducationUON />
            </Suspense>
          }
        />
        <Route
          path={routes.educationAGSB}
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <EducationAGSB />
            </Suspense>
          }
        />
        <Route
          path="*"
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <NotFound />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
}

export default App;
