import classes from './Footer.module.css';

interface FooterProps {}

function Footer(_props: FooterProps) {
  return (
    <footer className={classes.container}>
      <div>
        <div>
          <a href="#top" target="_blank" className={classes.socialLink}>
            Github
          </a>
          <a href="#top" target="_blank" className={classes.socialLink}>
            LinkedIn
          </a>
        </div>
      </div>
      <div>
        <div>
          <div className={classes.name}>Qingqi Shi</div>
          <div className={classes.copyRight}>© {new Date().getFullYear()}</div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
