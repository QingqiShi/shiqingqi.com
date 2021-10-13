import { Suspense } from 'react';
import Card from './Card';
import classes from './ExperienceCard.module.css';

interface ExperienceCardProps {
  dates: string;
  logo?: React.ReactNode;
}

function ExperienceCard({ dates, logo }: ExperienceCardProps) {
  return (
    <Card>
      {logo && (
        <Suspense fallback="loading...">
          <div className={classes.logo}>{logo}</div>
        </Suspense>
      )}
      <div className={classes.dates}>{dates}</div>
    </Card>
  );
}

export default ExperienceCard;
