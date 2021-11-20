import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './contexts/theme';
import { TranslationProvider, useTranslation } from './contexts/translation';
import Layout from './components/Layout';
import Home from './components/Home';

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
      <Route path="/" element={<Home />} />
    </Routes>
  );
}

export default App;
