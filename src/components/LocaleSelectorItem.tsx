import { NavLink } from 'react-router-dom';
import classes from './LocaleSelectorItem.module.css';

interface LocaleSelectorItemProps {
  label: string;
  ariaLabel: string;
  flag: string;
  to: string;
}

function LocaleSelectorItem({
  label,
  ariaLabel,
  flag,
  to,
  ...props
}: LocaleSelectorItemProps &
  Omit<React.ComponentProps<typeof NavLink>, 'to' | 'children'>) {
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
      {...props}
    >
      <span>{label}</span>
      <span>{flag}</span>
    </NavLink>
  );
}

export default LocaleSelectorItem;
