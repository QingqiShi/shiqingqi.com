import { PropsWithChildren } from 'react';
import ThemeSwitch from './ThemeSwitch';
import classes from './Layout.module.css';

interface LayoutProps {}

function Layout({ children }: PropsWithChildren<LayoutProps>) {
  return (
    <div className={classes.wrapper}>
      <div className={classes.wrapperInner}>
        <div className={classes.headerContainer}>
          <div className={`${classes.wrapper} ${classes.header}`}>
            <ThemeSwitch />
          </div>
        </div>
        <div className={`${classes.linesContainer} ${classes.wrapper}`}>
          <div className={classes.line} />
          <div className={classes.line} />
          <div className={classes.line} />
          <div className={classes.line} />
          <div className={classes.line} />
        </div>
        {children}
      </div>
    </div>
  );
}

export default Layout;
