import { ComponentProps, PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'phosphor-react';
import { useTranslation } from '../contexts/translation';
import classes from './Card.module.css';

interface CardProps extends ComponentProps<typeof Link> {}

function Card({ children, ...rest }: PropsWithChildren<CardProps>) {
  const { t } = useTranslation({
    en: async () => (await import('./Card-en')).default,
    zh: async () => (await import('./Card-zh')).default,
  });
  return (
    <Link className={classes.card} {...rest}>
      {children}
      <div className={classes.detailsIndicator} role="presentation">
        <span>{t('DETAILS')}</span>
        <ArrowRight />
      </div>
    </Link>
  );
}

export default Card;
