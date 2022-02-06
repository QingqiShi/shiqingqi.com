import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './contexts/theme';
import { TranslationProvider, useTranslation } from './contexts/translation';
import Layout from './components/Layout';

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

function LocalisedRoutes({ locale }: { locale: string }) {
  const { setLocale } = useTranslation();
  useEffect(() => {
    setLocale(locale);
  }, [locale, setLocale]);
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback="">
            <Home />
          </Suspense>
        }
      />

      <Route
        path="/experiences/citadel"
        element={
          <Suspense fallback="">
            <ExperienceCitadel />
          </Suspense>
        }
      />
      <Route
        path="/experiences/spotify"
        element={
          <Suspense fallback="">
            <ExperienceSpotify />
          </Suspense>
        }
      />
      <Route
        path="/experiences/wunderman-thompson-commerce"
        element={
          <Suspense fallback="">
            <ExperienceWtc />
          </Suspense>
        }
      />

      <Route
        path="/education/university-of-bristol"
        element={
          <Suspense fallback="">
            <EducationUOB />
          </Suspense>
        }
      />
      <Route
        path="/education/university-of-nottingham"
        element={
          <Suspense fallback="">
            <EducationUON />
          </Suspense>
        }
      />
      <Route
        path="/education/altrincham-grammar-school-for-boys"
        element={
          <Suspense fallback="">
            <EducationAGSB />
          </Suspense>
        }
      />
    </Routes>
  );
}

export default App;
