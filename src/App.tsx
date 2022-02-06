import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './contexts/theme';
import { TranslationProvider, useTranslation } from './contexts/translation';
import Layout from './components/Layout';
import { getLocalePath } from './utils/pathname';
import classes from './App.module.css';

const Home = lazy(() => import('./pages/Home'));
const ExperienceCitadel = lazy(() => import('./pages/experiences/Citadel'));
const ExperienceSpotify = lazy(() => import('./pages/experiences/Spotify'));
const ExperienceWtc = lazy(() => import('./pages/experiences/Wtc'));
const EducationUOB = lazy(() => import('./pages/education/UOB'));
const EducationUON = lazy(() => import('./pages/education/UON'));
const EducationAGSB = lazy(() => import('./pages/education/AGSB'));

function App() {
  return (
    <BrowserRouter>
      <HelmetProvider>
        <TranslationProvider>
          <ThemeProvider>
            <Routes>
              <Route element={<Layout />}>
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
  return (
    <>
      <Helmet>
        <link
          rel="alternate"
          hrefLang="en"
          href={`${window.location.origin}${getLocalePath(
            location.pathname,
            'en'
          )}`}
        />
        <link
          rel="alternate"
          hrefLang="zh"
          href={`${window.location.origin}${getLocalePath(
            location.pathname,
            'zh'
          )}`}
        />
        <link
          rel="canonical"
          href={`${window.location.origin}${getLocalePath(
            location.pathname,
            'en'
          )}`}
        />
      </Helmet>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <Home />
            </Suspense>
          }
        />

        <Route
          path="/experiences/citadel"
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <ExperienceCitadel />
            </Suspense>
          }
        />
        <Route
          path="/experiences/spotify"
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <ExperienceSpotify />
            </Suspense>
          }
        />
        <Route
          path="/experiences/wunderman-thompson-commerce"
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <ExperienceWtc />
            </Suspense>
          }
        />

        <Route
          path="/education/university-of-bristol"
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <EducationUOB />
            </Suspense>
          }
        />
        <Route
          path="/education/university-of-nottingham"
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <EducationUON />
            </Suspense>
          }
        />
        <Route
          path="/education/altrincham-grammar-school-for-boys"
          element={
            <Suspense fallback={<div className={classes.skeleton} />}>
              <EducationAGSB />
            </Suspense>
          }
        />
      </Routes>
    </>
  );
}

export default App;
