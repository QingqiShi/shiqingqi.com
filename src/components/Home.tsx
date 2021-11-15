import { lazy, Suspense } from 'react';
import classes from './Home.module.css';
import Layout from './Layout';
import Grid from './Grid';
import Footer from './Footer';
import ExperienceCard from './ExperienceCard';
import EducationCard from './EducationCard';
import AgsbPng from '../../assets/AGSB.png';
import AgsbWebp from '../../assets/AGSB.webp';

const Citadel = lazy(() => import('../logos/Citadel'));
const Spotify = lazy(() => import('../logos/Spotify'));
const Wtc = lazy(() => import('../logos/Wtc'));
const Bristol = lazy(() => import('../logos/Bristol'));
const Nottingham = lazy(() => import('../logos/Nottingham'));
const FlowGradient = lazy(() => import('./FlowGradient'));

interface HomeProps {}

function Home(_props: HomeProps) {
  return (
    <>
      <div className={classes.flowGradient}>
        <Suspense fallback={<></>}>
          <FlowGradient />
        </Suspense>
      </div>
      <Layout>
        <div className={classes.heroContainer}>
          <h1>
            Hi, I&apos;m Qingqi.
            <br /> I&apos;m a software engineer.
          </h1>

          <p>
            I value <strong>craftsman&apos;s spirit</strong>. Craftsmen make things
            with <strong>perfection</strong>, <strong>precision</strong> and{' '}
            <strong>patience</strong>. I apply these principles to software
            engineering and life in general.
          </p>
        </div>

        <div className={classes.sectionContainer}>
          <h2>Experiences</h2>

          <Grid>
            <div>
              <ExperienceCard logo={<Citadel />} dates="Aug 2021 - Now" />
            </div>
            <div>
              <ExperienceCard logo={<Spotify />} dates="Jul 2019 - Aug 2021" />
            </div>
            <div>
              <ExperienceCard logo={<Wtc />} dates="Sep 2017 - Jul 2019" />
            </div>
          </Grid>
        </div>

        <div className={classes.sectionContainer}>
          <h2>Education</h2>

          <Grid>
            <div>
              <EducationCard
                logo={<Bristol />}
                university="University of Bristol"
                dates="Sep 2016 - Jan 2018"
              />
            </div>

            <div>
              <EducationCard
                logo={<Nottingham />}
                university="University of Nottingham"
                dates="Sep 2013 - Jul 2016"
              />
            </div>

            <div>
              <EducationCard
                logo={
                  <picture>
                    <source srcSet={AgsbWebp} type="image/webp" />
                    <source srcSet={AgsbPng} type="image/png" />
                    <img
                      src={AgsbPng}
                      alt="Altrincham Grammar School for Boys"
                      title="Altrincham Grammar School for Boys"
                    />
                  </picture>
                }
                university="Altrincham Grammar School for Boys"
                dates="Sep 2011 - Jul 2013"
              />
            </div>
          </Grid>
        </div>

        <Footer />
      </Layout>
    </>
  );
}

export default Home;
