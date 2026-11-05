import type { StyleProp } from "@tuja/ui/types";

interface AssistantLogoProps {
  css?: StyleProp;
}

/** The Assistant mark. The icons in this folder draw the same mark. */
export function AssistantLogo({ css }: AssistantLogoProps) {
  return (
    <svg viewBox="0 0 512 512" aria-hidden="true" css={css}>
      <rect width="512" height="512" rx="115.2" fill="#EFB24A" />
      <path
        d="M256 86a170 170 0 1 0 0 340H398a28 28 0 0 0 28-28V256A170 170 0 0 0 256 86Z"
        fill="#1E1D1A"
      />
      <path
        d="M164 214 L256 286 L348 214"
        fill="none"
        stroke="#F7F4EA"
        strokeWidth="38"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
