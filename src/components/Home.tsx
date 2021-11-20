import { lazy, Suspense } from 'react';
import classes from './Home.module.css';
import Layout from './Layout';
import Grid from './Grid';
import Footer from './Footer';
import ExperienceCard from './ExperienceCard';
import EducationCard from './EducationCard';
import AgsbPng from '../../assets/AGSB.png';
import AgsbWebp from '../../assets/AGSB.webp';
import { useTranslation } from '../contexts/translation';

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
            <ExperienceCard logo={<Citadel />} dates={t('CITADEL_DATE')} />
          </div>
          <div>
            <ExperienceCard logo={<Spotify />} dates={t('SPOTIFY_DATE')} />
          </div>
          <div>
            <ExperienceCard logo={<Wtc />} dates={t('WTC_DATE')} />
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
            />
          </div>

          <div>
            <EducationCard
              logo={<Nottingham />}
              university={t('UON')}
              dates={t('UON_DATE')}
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
            />
          </div>
        </Grid>
      </div>

      <Footer />
    </>
  );
}

export default Home;
