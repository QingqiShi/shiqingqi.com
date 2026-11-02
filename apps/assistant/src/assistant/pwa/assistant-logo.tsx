import type { StyleProp } from "@tuja/ui/types";

interface AssistantLogoProps {
  css?: StyleProp;
}

/**
 * The Assistant mark: an envelope with a new-mail dot, on a dark tile. The
 * icons in this folder draw the same mark.
 */
export function AssistantLogo({ css }: AssistantLogoProps) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" css={css}>
      <rect width="512" height="512" rx="115.2" fill="#1F1D1A" />
      <g
        fill="none"
        stroke="#F5F2EC"
        strokeWidth="28"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="112" y="160" width="288" height="200" rx="28" />
        <path d="M122 172L256 277L390 172" />
      </g>
      <circle cx="392" cy="152" r="44" fill="#E8B04A" />
    </svg>
  );
}
