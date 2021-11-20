import { ComponentProps } from 'react';
import classes from './Button.module.css';

interface ButtonProps {}

function Button(props: ComponentProps<'button'>) {
  return <button className={classes.button} {...props} />;
}

export default Button;
