import { PropsWithChildren } from 'react';
import classes from './Card.module.css';

interface CardProps {}

function Card({ children }: PropsWithChildren<CardProps>) {
  return <button className={classes.card}>{children}</button>;
}

export default Card;
