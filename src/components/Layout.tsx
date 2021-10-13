import { PropsWithChildren } from 'react';
import classes from './Layout.module.css';

interface LayoutProps {}

function Layout({ children }: PropsWithChildren<LayoutProps>) {
  return (
    <div className={classes.wrapper}>
      <div className={classes.linesContainer}>
        <div className={classes.line} />
        <div className={classes.line} />
        <div className={classes.line} />
        <div className={classes.line} />
        <div className={classes.line} />
      </div>
      {children}
    </div>
  );
}

export default Layout;
