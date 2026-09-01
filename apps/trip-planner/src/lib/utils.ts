/* eslint-disable conventions/export-matches-filename -- shadcn/ui imports `cn`
   from this fixed path, so the file name is a contract. */
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
