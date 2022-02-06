import { useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useOutsideClick } from 'rooks';
import { Translate } from 'phosphor-react';
import { useTranslation } from '../contexts/translation';
import { getLocalePath } from '../utils/pathname';
import Button from './Button';
import classes from './LocaleSelector.module.css';
import LanguageSelectorItem from './LocaleSelectorItem';

interface LanguageSelectorProps {}

function LanguageSelector(_props: LanguageSelectorProps) {
  const [showMenu, setShowMenu] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);
  useOutsideClick(menuRef, () => setShowMenu(false), showMenu);

  const { t } = useTranslation({
    en: async () => (await import('./LocaleSelector-en')).default,
    zh: async () => (await import('./LocaleSelector-zh')).default,
  });

  const { pathname } = useLocation();

  return (
    <div className={classes.container}>
      <Button
        type="button"
        aria-haspopup="menu"
        aria-controls="language-selector-menu"
        aria-label={t('LABEL')}
        aria-expanded={showMenu}
        onClick={() => setShowMenu(true)}
      >
        <Translate />
      </Button>
      <div
        id="language-selector-menu"
        role="menu"
        className={`${classes.menu} ${showMenu ? classes.menuShown : ''}`}
        aria-hidden={!showMenu}
        ref={menuRef}
        onBlur={(e) => {
          if (!menuRef.current?.contains(e.relatedTarget)) {
            setShowMenu(false);
          }
        }}
      >
        <LanguageSelectorItem
          label="English"
          flag="🇬🇧"
          ariaLabel={t('EN_LABEL')}
          to={getLocalePath(pathname, 'en')}
        />
        <LanguageSelectorItem
          label="中文"
          flag="🇬🇧"
          ariaLabel={t('ZH_LABEL')}
          to={getLocalePath(pathname, 'zh')}
        />
      </div>
    </div>
  );
}

export default LanguageSelector;
