import { routes } from './routes';

export const cononicalOrigin = 'https://qingqi.dev';
const localePrefixes = /^\/zh/;

export const normalizePath = (pathname: string): string =>
  pathname.replace(localePrefixes, '');

export const getLocalePath = (
  pathname: string,
  locale: string,
  defaultLocale = 'en'
): string => {
  const normalizedPathname = normalizePath(pathname);
  if (locale === defaultLocale) return normalizedPathname;
  return `/${locale}${normalizedPathname}`;
};

export const getFullPath = (pathname: string, locale: string) =>
  `${cononicalOrigin}${getLocalePath(pathname, locale)}`;

export const isKnownPath = (pathname: string) => {
  const normalizedPathname = normalizePath(pathname);
  return Object.values(routes).includes(normalizedPathname);
};
