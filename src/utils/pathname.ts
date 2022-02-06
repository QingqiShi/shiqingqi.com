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
