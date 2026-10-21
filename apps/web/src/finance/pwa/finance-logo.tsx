import type { StyleProp } from "@tuja/ui/types";
import { useId } from "react";

interface FinanceLogoProps {
  css?: StyleProp;
}

const HALF =
  "M11.4 4.76A1 1 0 0 0 9.736 4.013L3.537 9.523A1.6 1.6 0 0 0 3 10.719L3 18.6A1 1 0 0 0 4 19.6Q7.2 19.6 10.502 21.487A0.6 0.6 0 0 0 11.4 20.966Z";

/**
 * The Finance mark: a house whose two halves are the pages of an open ledger,
 * on a purple tile. The icons in this folder draw the same mark.
 */
export function FinanceLogo({ css }: FinanceLogoProps) {
  const gradientId = useId();
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" css={css}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor="#AE55DC" />
          <stop offset="1" stopColor="#9035C4" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="115.2" fill={`url(#${gradientId})`} />
      <g transform="translate(71.68 58.88) scale(15.36)" fill="#fff">
        <path d={HALF} />
        <path transform="matrix(-1 0 0 1 24 0)" d={HALF} />
      </g>
    </svg>
  );
}
