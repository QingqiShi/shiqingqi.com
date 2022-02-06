import { ComponentProps, Suspense } from 'react';
import Card from './Card';
import classes from './EducationCard.module.css';

interface EducationCardProps extends ComponentProps<typeof Card> {
  university: string;
  dates: string;
  logo?: React.ReactNode;
  logoSrc?: string;
}

function EducationCard({
  university,
  dates,
  logo,
  logoSrc,
  ...rest
}: EducationCardProps) {
  return (
    <Card {...rest}>
      <div className={classes.topRow}>
        <div className={classes.logo} aria-hidden>
          {logo && (
            <Suspense fallback={<div className={classes.skeleton} />}>
              {logo}
            </Suspense>
          )}
          {logoSrc && <img src={logoSrc} alt={university} />}
        </div>
        <span className={classes.university}>{university}</span>
      </div>
      <time className={classes.dates}>{dates}</time>
    </Card>
  );
}

export default EducationCard;
