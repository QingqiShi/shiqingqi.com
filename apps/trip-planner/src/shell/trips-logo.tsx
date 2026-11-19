import type { StyleProp } from "@tuja/ui/types";
import { useId } from "react";

interface TripsLogoProps {
  css?: StyleProp;
}

/**
 * The Trips mark: a road over a hill to the sun. `src/pwa/trips-icon.svg` is
 * the same drawing, and the icons are made from it.
 */
export function TripsLogo({ css }: TripsLogoProps) {
  // A TabView draws its header in the sidebar and in the rail. With fixed
  // ids, the copy on screen takes its gradients from the hidden copy and
  // shows no colour.
  const id = useId();
  const paint = (name: string) => `url(#${id}${name})`;
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" css={css}>
      <defs>
        <clipPath id={`${id}tile`}>
          <rect width="512" height="512" rx="115.2" />
        </clipPath>
        <linearGradient
          id={`${id}sky`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="300"
        >
          <stop stopColor="#1B3682" />
          <stop offset="1" stopColor="#203E93" />
        </linearGradient>
        <linearGradient
          id={`${id}sun`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="133"
          x2="0"
          y2="280"
        >
          <stop stopColor="#FEC956" />
          <stop offset="1" stopColor="#FDBA35" />
        </linearGradient>
        <linearGradient
          id={`${id}hill`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="278"
          x2="0"
          y2="512"
        >
          <stop stopColor="#132555" />
          <stop offset="1" stopColor="#0F1F44" />
        </linearGradient>
        <linearGradient
          id={`${id}road`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="278"
          x2="0"
          y2="512"
        >
          <stop stopColor="#F7EED9" />
          <stop offset="0.45" stopColor="#F6F3EA" />
        </linearGradient>
        <linearGradient
          id={`${id}crest`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="512"
          y2="0"
        >
          <stop offset="0.12" stopColor="#FEC03F" stopOpacity="0" />
          <stop offset="0.5" stopColor="#FED98C" stopOpacity="0.35" />
          <stop offset="0.88" stopColor="#FEC03F" stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${id}edge`}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1="0"
          x2="0"
          y2="200"
        >
          <stop stopColor="#FFF" stopOpacity="0.16" />
          <stop offset="1" stopColor="#FFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g clipPath={paint("tile")}>
        <rect width="512" height="512" fill={paint("sky")} />
        <circle cx="256" cy="278.5" r="145" fill={paint("sun")} />
        <path d="M0 317Q256 240 512 317V512H0Z" fill={paint("hill")} />
        <path
          d="M0 317Q256 240 512 317"
          fill="none"
          stroke={paint("crest")}
          strokeWidth="2"
        />
        <path d="M243.7 278.5H268.3L408.4 512H103.6Z" fill={paint("road")} />
        <path
          d="M253.94 298.5H258.06L259.71 321H252.29ZM250.74 342H261.26L264.01 379.5H247.99ZM245.67 411H266.33L270.66 470H241.34Z"
          fill="#11224C"
        />
        <rect
          x="1"
          y="1"
          width="510"
          height="510"
          rx="114.2"
          fill="none"
          stroke={paint("edge")}
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
