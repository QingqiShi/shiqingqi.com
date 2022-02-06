import { lazy } from 'react';
import Grid from '../components/Grid';
import ExperienceCard from '../components/ExperienceCard';
import EducationCard from '../components/EducationCard';
import AgsbPng from '../../assets/AGSB.png';
import AgsbWebp from '../../assets/AGSB.webp';
import { useTranslation } from '../contexts/translation';
import classes from './Home.module.css';

const Citadel = lazy(() => import('../logos/Citadel'));
const Spotify = lazy(() => import('../logos/Spotify'));
const Wtc = lazy(() => import('../logos/Wtc'));
const Bristol = lazy(() => import('../logos/Bristol'));
const Nottingham = lazy(() => import('../logos/Nottingham'));

interface HomeProps {}

function Home(_props: HomeProps) {
  const { t } = useTranslation({
    en: async () => (await import('./Home-en')).default,
    zh: async () => (await import('./Home-zh')).default,
  });
  return (
    <>
      <div className={classes.heroContainer}>
        <h1>
          {t('TITLE_1')}
          <br />
          {t('TITLE_2')}
        </h1>
        <p>{t('BRIEF', { interpolate: true })}</p>
      </div>

      <div className={classes.sectionContainer}>
        <h2>{t('EXPERIENCES_TITLE')}</h2>

        <Grid>
          <div>
            <ExperienceCard
              logo={<Citadel />}
              dates={t('CITADEL_DATE')}
              to="experiences/citadel"
            />
          </div>
          <div>
            <ExperienceCard
              logo={<Spotify />}
              dates={t('SPOTIFY_DATE')}
              to="experiences/spotify"
            />
          </div>
          <div>
            <ExperienceCard
              logo={<Wtc />}
              dates={t('WTC_DATE')}
              to="experiences/wunderman-thompson-commerce"
            />
          </div>
        </Grid>
      </div>

      <div className={classes.sectionContainer}>
        <h2>{t('EDUCATION_TITLE')}</h2>

        <Grid>
          <div>
            <EducationCard
              logo={<Bristol />}
              university={t('UOB')}
              dates={t('UOB_DATE')}
              to="education/university-of-bristol"
            />
          </div>

          <div>
            <EducationCard
              logo={<Nottingham />}
              university={t('UON')}
              dates={t('UON_DATE')}
              to="education/university-of-nottingham"
            />
          </div>

          <div>
            <EducationCard
              logo={
                <picture>
                  <source srcSet={AgsbWebp} type="image/webp" />
                  <source srcSet={AgsbPng} type="image/png" />
                  <img src={AgsbPng} alt={t('AGSB')} title={t('AGSB')} />
                </picture>
              }
              university={t('AGSB')}
              dates={t('AGSB_DATE')}
              to="education/altrincham-grammar-school-for-boys"
            />
          </div>
        </Grid>
      </div>
    </>
  );
}

export default Home;
