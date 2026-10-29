import type { StyleProp } from "@tuja/ui/types";

interface FinanceLogoProps {
  css?: StyleProp;
}

const MARK =
  "M12.698 3.35L20.498 9.75A1.1 1.1 0 0 1 20.9 10.6L20.9 20.2A1.1 1.1 0 0 1 19.8 21.3L4.2 21.3A1.1 1.1 0 0 1 3.1 20.2L3.1 10.6A1.1 1.1 0 0 1 3.502 9.75L11.302 3.35A1.1 1.1 0 0 1 12.698 3.35ZM9.5 10.7H14.5A0.9 0.9 0 0 1 14.5 12.5H9.5A0.9 0.9 0 0 1 9.5 10.7ZM12 14.1A2.3 2.3 0 1 1 12 18.7A2.3 2.3 0 1 1 12 14.1Z";

/**
 * The Finance mark: a house that is a money box, with a coin slot and a coin,
 * on a cream tile. The icons in this folder draw the same mark.
 */
export function FinanceLogo({ css }: FinanceLogoProps) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" css={css}>
      <rect width="512" height="512" rx="115.2" fill="#EFE6D2" />
      <path
        transform="translate(51.2 44.373) scale(17.067)"
        fillRule="evenodd"
        fill="#1F4D3A"
        d={MARK}
      />
    </svg>
  );
}
