import { Suspense } from 'react';
import Card from './Card';
import classes from './EducationCard.module.css';

interface EducationCardProps {
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
}: EducationCardProps) {
  return (
    <Card>
      <div className={classes.topRow}>
        <div className={classes.logo} aria-hidden>
          {logo && <Suspense fallback="loading...">{logo}</Suspense>}
          {logoSrc && <img src={logoSrc} alt={university} />}
        </div>
        <span className={classes.university}>{university}</span>
      </div>
      <div className={classes.dates}>{dates}</div>
    </Card>
  );
}

export default EducationCard;
