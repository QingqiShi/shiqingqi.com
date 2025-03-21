import * as stylex from "@stylexjs/stylex";
import type { CSSProperties } from "react";
import { color } from "@/tokens.stylex";
import { svgTokens } from "./svg.stylex";

interface NottinghamLogoProps {
  title: string;
  className?: string;
  style?: CSSProperties;
}

export default function NottinghamLogo({
  title,
  className,
  style,
}: NottinghamLogoProps) {
  return (
    <svg
      viewBox="0 0 115.79 170"
      className={className}
      style={style}
      css={styles.svg}
    >
      <title>{title}</title>
      <g>
        <path
          d="M90.113,27.729V12.489c7.457,1.824,12.927,4.307,18.723,7.459v14.243
   C103.041,31.542,96.747,29.219,90.113,27.729"
        />
        <path
          d="M79.181,104.433l0.997-31.147c0-1.985,1.488-3.475,3.313-3.475c1.991,0,3.311,1.49,3.311,3.475
   l1.161,31.147H79.181z"
        />
        <path
          d="M83.49,163.897c-10.768,0-18.22-3.146-26.838-7.615c-7.615-3.976-15.077-6.458-24.852-6.458
   c-9.104,0-20.041,2.322-31.8,9.604c9.771-14.571,22.696-18.887,34.785-18.887c12.925,0,23.026,3.981,32.14,8.626
   c8.451,4.297,15.072,6.446,24.354,6.446c7.787,0,16.4-2.149,24.516-8.929C105.688,159.928,93.929,163.897,83.49,163.897"
        />
        <path
          d="M90.113,31.045c-3.976-0.997-8.278-1.655-12.585-2.156V9.839c-4.639-0.663-9.444-0.99-14.412-0.99
   c-4.641,0-9.283,0.328-13.753,0.826v18.054c-4.307,0.502-8.449,1.33-12.423,2.32V12.162c-7.127,1.987-13.917,4.801-20.044,8.282
   v37.108l8.445,8.116l-2.483,41.742l-6.792,6.792v24.182l2.318,2.489c5.633-2.971,12.754-5.462,21.37-5.462
   c8.28,0,17.891,2.316,28.661,8.287v-30.812l-4.472-5.646V64.505l8.778-13.584l-3.646,13.083c2.487-0.323,4.97-0.488,7.622-0.488
   c8.616,0,16.565,1.486,23.357,4.142l8.781-8.122V37.508C103.041,34.854,96.747,32.698,90.113,31.045 M37.433,104.433l0.999-31.147
   c0-1.985,1.49-3.475,3.313-3.475c1.824,0,3.313,1.49,3.313,3.475l1.166,31.147H37.433z"
        />
      </g>
    </svg>
  );
}

const styles = stylex.create({
  svg: {
    color: stylex.firstThatWorks(svgTokens.fill, color.brandNottingham),
    fill: "currentColor",
    objectFit: "contain",
    width: "100%",
    height: "100%",
    transition: "fill .2s",
  },
});
