import { ComponentProps, Suspense } from 'react';
import Card from './Card';
import classes from './ExperienceCard.module.css';

interface ExperienceCardProps extends ComponentProps<typeof Card> {
  dates: string;
  logo?: React.ReactNode;
}

function ExperienceCard({ dates, logo, ...rest }: ExperienceCardProps) {
  return (
    <Card {...rest}>
      {logo && (
        <Suspense fallback={<div className={classes.skeleton} />}>
          <div className={classes.logo}>{logo}</div>
        </Suspense>
      )}
      <time className={classes.dates}>{dates}</time>
    </Card>
  );
}

export default ExperienceCard;
