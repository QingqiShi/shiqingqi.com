import { useTheme } from '../contexts/theme';

interface BristolProps {}

function Bristol(_props: BristolProps) {
  const { theme } = useTheme();
  const color = theme === 'dark' ? '#ff535d' : '#bf2f38';
  return (
    <svg viewBox="0 0 156 164">
      <title>University of Bristol</title>
      <g transform="translate(-16.9375,-333.76838)">
        <clipPath id="clippath1">
          <path
            d="M 0,634.957 L 0,792 L 542.832,792 L 542.832,634.957"
            id="path3094"
          />
        </clipPath>
        <g id="g3096">
          <g id="g4202">
            <g
              transform="translate(17.933824,-296.90442)"
              style={{
                fill: color,
                fillRule: 'nonzero',
                strokeWidth: 0,
                strokeLinecap: 'butt',
                strokeLinejoin: 'miter',
                strokeMiterlimit: 10,
                fillOpacity: 1,
              }}
              id="g3122"
            >
              <path
                style={{ fill: color, fillOpacity: 1 }}
                d="M 103.047,705.219 C 102.98,699.828 101.148,688.809 88.2539,682.555 C 101.348,686.715 107.648,697.781 108.289,706.035 C 122.039,708.777 134.242,715.246 154.055,708.414 L 154.121,708.371 C 154.121,708.371 128.051,708.609 117.148,700.723 C 122.781,700.934 129.262,699.66 131.387,696.473 C 133.648,693.078 133.883,689.57 139.461,689.391 C 142.594,689.289 153.219,690.082 154.332,674.48 C 150.934,680.219 147.25,682.59 141.691,681.172 C 138.141,680.27 131.66,677.551 127.027,683.086 C 123.203,687.652 119.098,690.027 112.547,689.32 C 115.168,685.777 154.227,635.062 154.227,635.062 C 154.227,635.062 104.188,675.223 101.426,677.562 C 100.895,670.23 103.09,667.539 106.027,664.316 C 108.434,661.68 112.613,658.109 109.285,650.574 C 106.598,644.484 106.949,640.801 114.281,634.957 C 108.438,635.383 99.5195,639.312 100.574,650.043 C 101.215,656.523 96.6211,657.086 94.9453,658.012 C 90.5898,660.422 90.0234,667.434 89.8789,672.887 C 89.3867,671.113 83.0469,643.863 80.8164,635.047 C 80.8164,635.051 80.8164,708.371 80.8164,708.371 L 80.9844,708.371 C 89.4766,705.027 96.5391,704.516 103.047,705.219"
              />
            </g>

            <g
              transform="translate(17.933824,-296.90442)"
              style={{
                fill: color,
                fillRule: 'nonzero',
                strokeWidth: 0,
                strokeLinecap: 'butt',
                strokeLinejoin: 'miter',
                strokeMiterlimit: 10,
                fillOpacity: 1,
              }}
            >
              <path
                style={{ fill: color, fillOpacity: 1 }}
                d="M 53.9414,674.707 C 53.3711,671.66 53.6563,665.641 56.6328,659.691 C 45.6523,667.977 45.5117,674.707 45.5117,674.707 C 45.5117,674.707 47.6367,673.078 53.9414,674.707 z M 48.8398,656.574 C 48.8398,656.574 35.5234,658.488 31.6992,658.844 C 29.0625,660.398 26.0352,664.758 26.0352,664.758 C 26.0352,664.758 22.918,665.215 16.6836,666.348 C 12.3516,669.176 9.74219,675.77 15.125,681.152 C 13.4258,680.797 13.4258,680.797 10.9492,680.371 C 5.63672,683.773 8.11328,690.078 19.1641,687.883 C 16.0469,687.773 14.4883,686.254 14.5234,684.27 C 14.4531,682.109 18.668,679.418 23.8008,680.797 C 18.9141,671.555 24.332,667.906 24.332,667.906 C 24.332,667.906 21.4648,675.539 27.7344,681.789 C 28.3008,680.867 30.1758,678.285 35.4531,678.176 C 40.7109,678.07 44.0156,680.656 44.0938,683.633 C 44.1641,686.254 40.8359,689.016 36.5156,689.016 L 36.4453,682.754 C 36.4453,682.754 35.0391,683.258 34.6406,683.812 C 34.6445,684.102 34.6016,689.086 34.6016,689.086 C 32.9023,689.086 29.4336,688.379 27.5938,685.437 C 26.1758,685.297 18.2773,684.125 18.2773,684.125 L 18.7031,686.215 C 18.7031,686.215 21.4648,686.676 21.9961,689.437 C 22.6406,692.781 24.5469,695.848 26.2461,697.09 C 29.5391,696.699 34.9922,692.555 45.0156,692.699 C 35.8086,693.973 26.4609,703.816 13,700.063 C 34.3906,707.359 36.5859,691.141 63.3594,696.238 C 59.1797,693.688 52.9492,692.91 52.9492,692.91 C 52.9492,692.91 56.2773,689.297 56.418,683.773 C 56.8438,683.746 57.4102,683.703 58.4727,683.598 C 58.8281,681.824 59.0742,680.027 59.0742,680.027 C 59.0742,680.027 53.2305,680.02 48.3281,680.02 C 36.3906,667.941 48.8398,656.574 48.8398,656.574 z M 18.9531,656.363 C 22.3164,656.539 26.4063,654.449 26.6719,654.273 C 26.6719,654.273 25.2539,657.852 28.4414,657.637 C 31.9023,657.406 35.8828,655.633 36.4453,655.371 L 36.4453,650.766 C 36.1367,650.992 32.7656,653.375 28.9375,654.238 C 27.5391,654.551 28.0156,653.316 28.1563,652.609 C 28.3008,651.902 28.3945,651.32 25.8906,652.359 C 15.6563,656.609 15.125,653.707 15.125,653.352 C 14.7031,653.848 14.8828,656.148 18.9531,656.363 z M 73.1992,635.047 C 73.1992,635.047 73.1992,707.199 73.1992,708.371 C 43.6992,696.754 31.4102,719.277 0,708.371 C 0,708.703 0,635.047 0,635.047 L 14.9453,635.047 L 14.9453,642.961 L 23.5156,642.961 L 23.5156,635.047 L 31.9453,635.047 L 31.9453,642.961 L 40.4414,642.961 L 40.4453,635.047 L 48.9414,635.047 L 48.9414,642.961 L 58.1836,642.961 L 58.1836,635.047 L 73.1992,635.047"
              />
            </g>

            <g
              transform="translate(17.933824,-296.90442)"
              style={{
                fill: color,
                fillRule: 'nonzero',
                strokeWidth: 0,
                strokeLinecap: 'butt',
                strokeLinejoin: 'miter',
                strokeMiterlimit: 10,
                fillOpacity: 1,
              }}
            >
              <path
                style={{ fill: color, fillOpacity: 1 }}
                d="M 101.352,734.781 C 101.352,734.781 101.004,734.609 101.668,734.051 C 101.75,733.984 101.879,734.137 102.266,734.141 C 102.785,734.148 103.059,733.969 103.492,733.445 C 104.145,732.656 102.781,732.352 102.34,732.734 C 101.855,733.148 101.508,733.578 101.09,733.961 C 101.09,733.961 100.391,734.582 101.352,734.781 z M 126.605,771.824 C 125.438,772.777 121.824,774.602 120.922,775.027 C 120.02,775.453 119.727,775.711 119.063,777.027 C 118.246,778.641 117.469,781.563 117.68,781.773 C 119.91,781.422 121.504,779.543 121.504,779.543 C 121.504,779.543 121.539,779.082 121.043,778.301 C 120.633,777.656 121.434,776.957 121.93,777.363 C 122.309,777.676 122.832,777.738 123.152,777.469 C 123.469,777.203 130.43,772.777 130.746,772.266 C 129.332,770.867 128.25,769.449 128.25,769.449 C 128.25,769.449 127.773,770.867 126.605,771.824 z M 99.4063,752.414 C 96.4297,751.211 95.7656,750.406 95.2109,750.164 C 94.7148,749.957 92.668,750.824 92.3242,751.707 C 91.4023,754.078 89.3477,757.957 89.0469,758.508 C 88.8867,758.801 88.7109,759.145 88.7461,759.535 C 88.7813,759.922 88.8984,761.445 88.8633,761.801 C 88.8281,762.156 88.8789,762.617 89.0234,762.969 C 89.1641,763.324 89.3477,764.844 90.1289,766.367 C 91.8633,764.633 92.1172,762.074 92.0039,762.578 C 92.0039,762.594 92.5547,761.645 91.1719,761.215 C 90.7813,761.094 90.8398,760.07 91.2617,759.941 C 91.7773,759.781 92.0391,759.641 92.2891,758.723 C 92.5352,757.797 93.4727,754.488 93.7773,753.852 C 93.8242,753.754 93.9102,753.586 94.082,753.508 C 94.3477,753.383 94.6641,753.297 94.9258,753.254 C 95.0586,753.234 95.3086,753.375 95.3828,753.453 C 95.8555,753.93 98.3086,755.922 98.3086,755.922 C 98.3086,755.922 99.4063,755.816 100.078,755.531 C 99.6563,754.859 99.4766,753.23 99.4063,752.414 z M 96.4063,738.426 C 96.4063,738.426 95.3672,739.703 96.5391,740.02 C 96.5664,740.391 96.7109,741.125 96.8555,741.508 C 97.0508,742.02 97.3867,741.855 97.7617,741.426 C 98.1328,741.004 98.7305,740.195 99.168,739.73 C 99.5664,739.305 100.953,739.457 100.391,740.313 C 100.02,740.879 99.7266,741.031 99.2461,741.137 C 98.8711,741.219 98.7578,740.895 98.3438,741.457 C 97.9102,742.043 97.4492,742.453 98.2109,742.453 C 98.6094,742.453 99.3672,742.824 99.8711,742.742 C 100.348,742.668 100.398,742.359 100.449,741.934 C 100.504,741.488 100.418,741.234 100.914,740.961 C 101.551,740.605 102.488,739.754 102.773,739.453 C 103.098,739.109 103.516,739.188 103.941,739.188 C 104.363,739.188 106.418,739.438 107.641,737.605 C 108.504,736.313 108.598,734.551 108.277,732.957 C 108.863,733.539 109.648,735.379 109.234,737.098 C 108.496,740.164 106.988,740.336 105.461,740.656 C 104.824,741.559 103.195,743.879 102.328,748.098 C 101.957,748.344 98.875,751.316 101.453,756.199 C 100.789,756.414 98.832,757.254 97.6719,757.516 C 96.8945,757.691 96.2422,757.734 95.9258,758.109 C 95.5742,758.531 94.7578,759.914 95.1836,760.605 C 95.4844,761.094 97.4141,765.41 97.5742,766.742 C 97.7344,768.066 98.2148,768.383 98.6914,768.813 C 99.2227,769.289 99.5664,769.266 100.309,769.824 C 101.063,770.387 101.688,771.402 102.383,771.945 C 103.125,772.531 103.957,772.797 104.543,772.742 C 104.398,770.582 103.938,768.457 103.266,767.75 C 102.566,767.016 101.691,768.066 101.48,768.121 C 101.266,768.176 100.969,767.969 100.84,767.379 C 100.707,766.766 101.266,766.262 100.734,765.465 C 99.7461,763.984 98.8047,762.316 98.6914,762.09 C 98,760.738 99.1719,760.379 99.4609,760.445 C 100.152,760.605 104.293,761.164 104.93,761.215 C 105.566,761.27 105.922,761.375 106.207,761.055 C 107.082,760.074 107.586,759.355 108.094,758.348 C 109.02,759.039 108.383,760.367 108.117,761.941 C 108.383,762.172 114.387,765.199 122.641,763.004 C 126.086,762.09 125.691,762.813 126.02,763.445 C 128.02,767.324 129.438,768.824 131.813,770.727 C 132.52,771.289 133.016,772.211 133.332,772.742 C 133.652,773.273 133.73,774.219 133.477,774.832 C 133.156,775.594 131.313,778.898 130.996,779.363 C 130.395,780.25 129.609,780.992 128.941,781.348 C 126.852,782.465 126.332,783.465 126.102,784.246 C 126.578,784.246 131.465,784.246 131.465,784.246 C 131.465,784.246 131.59,783.965 131.527,783.297 C 131.438,782.359 132.289,782.199 132.555,782.145 C 132.82,782.094 133.297,782.305 133.723,781.297 C 134.52,779.398 137.637,774.105 137.902,773.629 C 138.168,773.148 139.141,771.871 138.184,771.309 C 136.379,770.246 135.316,768.5 134.961,766.543 C 134.82,765.766 134.906,764.484 136.66,762.297 C 140.414,757.621 137.617,747.988 129.262,748.164 C 124.52,748.266 121.883,747.863 118.797,747.246 C 117.668,747.02 117.473,746.41 117.715,745.723 C 117.965,745.016 118.203,743.605 118.211,743.031 C 117.398,742.285 116.156,741.828 115.555,741.613 C 114.906,741.387 114.582,740.867 115.238,740.816 C 115.891,740.766 118.371,741.031 118.371,741.031 C 118.371,741.031 118.461,739.703 118.105,737.754 C 117.043,737.293 115.695,736.902 114.281,736.727 C 113.906,736.68 113.578,736.262 114.527,736.125 C 115.77,735.949 116.902,736.145 117.785,736.09 C 117.84,735.984 117.363,733.504 116.484,732.504 C 115.875,732.32 115.551,732.234 113.43,731.98 C 112.688,731.895 112.652,731.68 113.148,731.52 C 113.723,731.336 114.68,731.148 115.875,731.227 C 115.414,730.594 112.332,724.973 105.941,726.66 C 106.656,727.539 107.004,727.945 107.215,728.547 C 107.406,729.086 106.836,729.258 106.313,728.707 C 104.293,726.582 103.23,726.633 101.93,726.395 C 102.781,727.219 103.152,728.043 103.445,728.863 C 101.984,729.902 99.9102,732.371 99.6172,732.852 C 99.0625,733.758 99.832,734.25 99.832,734.25 L 96.4063,738.426 z M 137.707,724.191 C 131.172,726.477 132.137,733.52 133.898,736.23 C 136.203,739.773 138.148,739.844 139.617,744.004 C 140.766,747.25 138.715,748.945 136.695,749.688 C 140.148,751.816 143.711,749.617 144.984,747.492 C 147.332,744.363 144.672,740.301 147.18,738.18 C 147.852,737.613 148.984,737.223 150.508,737.152 C 148.984,734.992 145.41,735.238 143.977,737.258 C 142.965,734.922 140.133,732.879 141.16,729.254 C 141.832,726.883 145.586,725.996 147.004,727.945 C 147.777,729.012 147.887,731.098 145.621,732.16 C 147.039,732.055 149.73,729.609 147.887,726.281 C 146.594,723.941 144.418,723.766 142.648,723.766 C 139.426,723.766 134.078,727.449 137.496,735.398 C 135.527,733.648 132.344,727.539 137.707,724.191 z M 154.008,715.914 C 154.008,714.742 154.008,789.324 154.008,789.328 C 113.426,799.207 112.254,777.641 80.8047,789.328 C 80.8086,790.281 80.793,715.906 80.8047,715.914 C 109.703,703.801 120.965,726.75 154.008,715.914"
              />
            </g>

            <g
              transform="translate(17.933824,-296.90442)"
              style={{
                fill: color,
                fillRule: 'nonzero',
                strokeWidth: 0,
                strokeLinecap: 'butt',
                strokeLinejoin: 'miter',
                strokeMiterlimit: 10,
                fillOpacity: 1,
              }}
            >
              <path
                style={{ fill: color, fillOpacity: 1 }}
                d="M 26.6289,757.797 C 26.6289,757.797 25.3438,758.633 26.9531,762.164 C 28.5625,765.688 30.5586,768.973 27.082,772.848 C 29.0547,772.871 33.3555,770.273 28.7539,762.531 C 27.6953,760.746 26.5508,759.512 26.6289,757.797 z M 22.2773,759.457 C 23.3398,759.387 23.4727,758.082 23.2813,757.398 C 23.0547,756.59 21.707,756.488 21.3789,757.52 C 21.0586,758.539 21.3398,759.527 21.3398,759.527 C 21.6055,760.512 22.7109,760.789 22.8086,760.691 C 22.1914,760.141 22.3594,759.824 22.2773,759.457 z M 23.2969,764.145 C 23.043,767.262 21.2539,767.723 21.2539,767.723 C 18.1328,766.289 16.4609,770.215 19.0781,771.371 C 22.3984,772.84 24.4258,768.551 24.625,767.758 C 25.1836,765.508 25.2383,763.918 24.9844,760.27 C 24.7734,757.156 25.5391,756.688 26.0508,756.602 C 26.5664,756.516 27.6328,756.473 28.6953,759.715 C 29.7617,762.957 32.0625,763.426 32.0625,763.426 C 32.0625,763.426 28.7305,758.004 33.3633,753 C 35.5195,750.676 39.9102,749.352 39.0977,746.094 C 39.0977,746.094 38.418,747.262 37.0977,747.605 C 35.7773,747.945 33.2148,748.328 33.2148,748.328 C 33.2148,748.328 39.3594,745.43 40.4648,742.102 C 40.4648,742.102 42.3867,745.301 39.8281,749.992 C 39.8281,749.992 42.2617,749.121 44.8867,750.305 C 51.5703,753.266 50.8594,762.785 42.4023,765.055 C 30.3672,768.285 34.7383,777.594 41.6289,778.164 C 40.8906,777.695 40.7227,774.891 41.9336,773.223 C 42.5352,772.684 43.6172,771.598 44.3008,773.883 C 45.5117,777.914 49.043,778.242 50.6836,777.738 C 50.2539,777.375 49.4492,776.148 49.5469,775.441 C 49.75,774.031 51.5117,775.496 52.1523,775.68 C 56.8945,777.023 59.4141,775.848 59.6836,775.141 C 58.625,774.922 58.8086,775.039 58.1367,774.871 C 57.5117,774.715 56.293,773.848 58.5742,773.324 C 62.7617,772.367 65.0664,768.047 62.3086,764.719 C 59.6758,761.539 56.3594,762.027 55.2813,762.465 C 59.8203,763.441 60.0469,767.094 57.7344,768.953 C 55.7188,770.469 50.707,771.07 48.9922,767.711 C 47.9102,768.492 47.5313,769.746 47.7148,771.309 C 47.2617,771.137 45.3594,768.434 48.1836,766.199 C 61.2813,757.754 59.168,743.566 48.0859,737.727 L 47.9453,737.668 C 37.8906,731.891 29.0938,737.164 29.0938,737.164 C 35.3125,730.938 46.0547,734.641 47.6016,735.414 C 47.6016,735.414 46.3633,734.34 45.707,733.352 C 44.8555,732.074 44.8867,730.852 44.8867,730.852 C 40.6211,733.234 39.5234,729.578 39.5234,729.578 C 39.5234,729.578 35.8281,732.906 33.4297,730.199 C 31.3359,727.828 34.7305,724.613 34.7305,724.613 C 13.0938,731.715 17.1953,743.934 17.1953,743.934 C 17.1953,743.934 14.0625,746.809 13.3594,753.746 C 12.5625,761.621 16.4883,767.223 21.3906,765.684 C 22.5156,765.332 23.0703,764.797 23.2891,764.207 L 23.2969,764.145 z M 73.2031,715.914 C 73.2148,715.906 73.1992,790.281 73.2031,789.328 C 41.7539,777.641 40.5859,799.207 0,789.328 C 0,789.324 0,714.742 0,715.914 C 33.0391,726.75 44.3047,703.801 73.2031,715.914"
              />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
}

export default Bristol;
