import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import ThemeSwitch from './ThemeSwitch';
import LocaleSelector from './LocaleSelector';
import classes from './Layout.module.css';

const FlowGradient = lazy(() => import('./FlowGradient'));

interface LayoutProps {}

function Layout(_props: LayoutProps) {
  return (
    <>
      <div className={classes.flowGradient}>
        <Suspense fallback={<></>}>
          <FlowGradient />
        </Suspense>
      </div>
      <div className={classes.wrapper}>
        <div className={classes.wrapperInner}>
          <div className={classes.headerContainer}>
            <nav className={`${classes.wrapper} ${classes.header}`}>
              <LocaleSelector />
              <ThemeSwitch />
            </nav>
          </div>
          <div className={`${classes.linesContainer} ${classes.wrapper}`}>
            <div className={classes.line} />
            <div className={classes.line} />
            <div className={classes.line} />
            <div className={classes.line} />
            <div className={classes.line} />
          </div>
          <Outlet />
        </div>
      </div>
    </>
  );
}

export default Layout;
