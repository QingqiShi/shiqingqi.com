import { Sun, Moon } from 'phosphor-react';
import Switch, { SwitchState } from './Switch';
import classes from './ThemeSwitch.module.css';
import { useTheme } from '../contexts/theme';
import { useTranslation } from '../contexts/translation';

interface ThemeSwitchProps {}

function ThemeSwitch(_props: ThemeSwitchProps) {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation({
    en: async () => (await import('./ThemeSwitch-en')).default,
    zh: async () => (await import('./ThemeSwitch-zh')).default,
  });
  return (
    <div className={classes.container}>
      <span className={classes.moon} aria-hidden>
        <Moon weight="fill" />
      </span>
      <span className={classes.sun} aria-hidden>
        <Sun weight="fill" />
      </span>
      <Switch
        value={theme === 'dark' ? SwitchState.ON : SwitchState.OFF}
        onChange={(newState) =>
          setTheme(newState === SwitchState.ON ? 'dark' : 'light')
        }
        aria-label={t('LABEL')}
      />
    </div>
  );
}

export default ThemeSwitch;
