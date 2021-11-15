import { useState, useContext, createContext, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useMediaMatch } from 'rooks';

type Theme = 'light' | 'dark';

const darkThemeClassName = 'dark';

const ThemeContext = createContext<
  { theme: Theme; setTheme: React.Dispatch<Theme> } | undefined
>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>('light');

  const isDark = useMediaMatch('(prefers-color-scheme: dark)');
  useEffect(() => {
    setTheme(isDark ? 'dark' : 'light');
  }, [isDark]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add(darkThemeClassName);
    } else {
      document.documentElement.classList.remove(darkThemeClassName);
    }
  }, [theme]);

  const value = { theme, setTheme };
  return (
    <>
      <Helmet>
        <meta
          name="theme-color"
          content={theme === 'dark' ? '#292929' : '#f3eded'}
        />
      </Helmet>
      <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    </>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
