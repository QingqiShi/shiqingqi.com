import { useTheme } from '../contexts/theme';

interface CitadelProps {}

function Citadel(_props: CitadelProps) {
  const { theme } = useTheme();
  const color = theme === 'dark' ? 'rgb(129 174 255)' : 'rgb(26,54,104)';
  return (
    <svg
      viewBox="0 0 842 100"
      style={{
        fillRule: 'evenodd',
        clipRule: 'evenodd',
        strokeLinejoin: 'round',
        strokeMiterlimit: 2,
      }}
    >
      <title>Citadel</title>
      <g transform="matrix(4.16667,0,0,4.16667,0,0)">
        <rect
          x="0"
          y="16.807"
          width="45.979"
          height="6.619"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <rect
          x="0"
          y="0.43"
          width="9.195"
          height="6.617"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <rect
          x="18.392"
          y="0.43"
          width="9.195"
          height="6.617"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <rect
          x="36.782"
          y="0.43"
          width="9.197"
          height="6.617"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <rect
          x="0"
          y="8.622"
          width="22.197"
          height="6.613"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <rect
          x="23.781"
          y="8.622"
          width="22.199"
          height="6.613"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <path
          d="M80.758,22.649C83.797,22.549 84.471,21.975 84.471,20.725L84.471,3.241C84.471,1.993 83.797,1.385 80.758,1.284L80.758,0.542L91.391,0.542L91.391,1.284C88.353,1.385 87.678,1.993 87.678,3.241L87.678,20.725C87.678,21.975 88.353,22.549 91.391,22.649L91.391,23.426L80.758,23.426L80.758,22.649Z"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <path
          d="M98.545,22.649C101.551,22.549 102.462,21.975 102.462,20.725L102.462,1.485L100.774,1.485C97.939,1.485 96.486,1.503 94.833,5.655L94.089,5.587L94.293,0.542L113.804,0.542L114.04,5.587L113.297,5.655C111.778,1.772 110.293,1.485 107.357,1.485L105.635,1.485L105.635,20.725C105.635,21.975 106.546,22.549 109.55,22.649L109.55,23.426L98.545,23.426L98.545,22.649Z"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <path
          d="M159.144,22.649C162.081,22.549 162.824,21.975 162.824,20.725L162.824,3.241C162.824,1.993 162.081,1.385 159.144,1.284L159.144,0.542L177.708,0.542L177.81,5.581L177.067,5.614C175.649,1.53 174.501,1.52 170.653,1.52L166.03,1.52L166.03,11.073L168.088,11.073C170.754,11.073 171.936,10.465 172.814,6.852L173.489,6.852L173.489,16.237L172.814,16.237C171.936,12.626 170.754,12.051 168.088,12.051L166.03,12.051L166.03,22.262L170.653,22.262C175.177,22.262 176.696,22.383 178.181,18.063L178.923,18.098L178.754,23.426L159.144,23.426L159.144,22.649Z"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <path
          d="M182.367,22.649C185.304,22.549 186.047,21.975 186.047,20.725L186.047,3.241C186.047,1.993 185.304,1.385 182.367,1.284L182.367,0.542L192.763,0.542L192.763,1.284C189.76,1.385 189.253,1.958 189.253,3.241L189.253,22.262L192.629,22.262C197.085,22.262 198.671,20.928 200.292,16L201.034,16.034L200.764,23.426L182.367,23.426L182.367,22.649Z"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <path
          d="M144.824,22.297L142.326,22.297L142.326,1.485L144.79,1.485C150.933,1.485 153.971,4.152 153.971,11.781C153.971,19.274 152.013,22.297 144.824,22.297ZM145.161,0.541L136.001,0.541L136.001,1.317C138.453,1.479 139.119,2.079 139.119,3.24L139.119,20.725C139.119,21.887 138.453,22.459 136.001,22.616L136.001,23.426L145.466,23.426C153.971,23.426 157.651,17.721 157.651,11.579C157.651,5.165 153.431,0.541 145.161,0.541Z"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <path
          d="M119.103,13.772L122.816,4.219L122.952,4.219L126.258,13.772L119.103,13.772ZM131.762,19.579L124.605,0.001L123.457,0.001L116.436,17.586C115.086,20.928 114.142,22.178 111.879,22.717L111.879,23.426L119.475,23.426L119.475,22.717C116.47,22.211 116.132,21.469 117.55,17.79L118.731,14.717L126.597,14.717L128.419,19.983C129.095,21.874 128.623,22.549 125.549,22.717L125.549,23.426L135.061,23.426L135.061,22.616C133.026,22.241 132.47,21.487 131.762,19.579Z"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
        <path
          d="M70.228,0.913C66.245,0.913 62.532,4.422 62.532,12.118C62.532,19.444 66.986,22.481 70.869,22.481C72.027,22.481 73.238,22.149 74.25,21.596C75.297,21.022 76.252,20.233 76.93,19.243C77.405,18.549 77.746,17.84 78.051,16.991L78.797,17.217C78.419,18.44 77.892,19.629 77.119,20.655C76.377,21.639 75.417,22.459 74.32,23.024C74.008,23.184 73.687,23.325 73.357,23.444C72.992,23.577 72.613,23.68 72.232,23.762C71.496,23.92 70.711,24 69.957,24C63.442,24 58.853,19.307 58.853,12.254C58.853,5.267 64.017,0 70.599,0C72.996,0 74.919,0.642 76.336,1.418L77.519,1.405L77.763,3.614L78.228,7.459L77.519,7.459C75.965,3.273 73.637,0.913 70.228,0.913Z"
          style={{
            fill: color,
            fillRule: 'nonzero',
          }}
        />
      </g>
    </svg>
  );
}

export default Citadel;
