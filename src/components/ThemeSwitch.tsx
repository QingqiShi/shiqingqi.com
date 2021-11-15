import { Sun, Moon } from 'phosphor-react';
import Switch, { SwitchState } from './Switch';
import classes from './ThemeSwitch.module.css';
import { useTheme } from '../contexts/theme';

interface ThemeSwitchProps {}

function ThemeSwitch(_props: ThemeSwitchProps) {
  const { theme, setTheme } = useTheme();
  return (
    <div className={classes.container}>
      <span className={classes.moon}>
        <Moon weight="fill" />
      </span>
      <span className={classes.sun}>
        <Sun weight="fill" />
      </span>
      <Switch
        value={theme === 'dark' ? SwitchState.ON : SwitchState.OFF}
        onChange={(newState) =>
          setTheme(newState === SwitchState.ON ? 'dark' : 'light')
        }
      />
    </div>
  );
}

export default ThemeSwitch;
