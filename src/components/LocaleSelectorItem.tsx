import { NavLink } from 'react-router-dom';
import classes from './LanguageSelectorItem.module.css';

interface LanguageSelectorItemProps {
  label: string;
  ariaLabel: string;
  flag: string;
  to: string;
}

function LanguageSelectorItem({
  label,
  ariaLabel,
  flag,
  to,
}: LanguageSelectorItemProps) {
  return (
    <NavLink
      to={to}
      role="menuitem"
      aria-label={ariaLabel}
      className={({ isActive }) =>
        [classes.menuItem, isActive && classes.menuItemActive]
          .filter(Boolean)
          .join(' ')
      }
    >
      <span>{label}</span>
      <span>{flag}</span>
    </NavLink>
  );
}

export default LanguageSelectorItem;
