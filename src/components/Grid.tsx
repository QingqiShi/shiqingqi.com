import { PropsWithChildren } from 'react';
import classes from './Grid.module.css';

interface GridProps {}

function Grid({ children }: PropsWithChildren<GridProps>) {
  return <div className={classes.gridContainer}>{children}</div>;
}

export default Grid;
