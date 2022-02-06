import { createContext, useContext, useEffect, useRef, useState } from 'react';

const TranslationContext = createContext<
  | { locale: string; setLocale: React.Dispatch<React.SetStateAction<string>> }
  | undefined
>(undefined);

interface TranslationProviderProps {
  children: React.ReactNode;
}

export const TranslationProvider = ({ children }: TranslationProviderProps) => {
  // the default locale is only used once on mount
  const defaultLocale = window.location.pathname.startsWith('zh') ? 'zh' : 'en';
  const [locale, setLocale] = useState(defaultLocale);
  return (
    <TranslationContext.Provider value={{ locale, setLocale }}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = <T extends { [key: string]: string }>(
  localeMap?: { [locale: string]: () => Promise<T> },
  componentMap?: typeof defaultComponents
) => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }

  const [isLoading, setIsLoading] = useState(false);

  const localeMapRef = useRef(localeMap);
  const { locale, setLocale } = context;
  const [translations, setTranslations] = useState<T | undefined>(undefined);
  useEffect(() => {
    let isMounted = true;
    (async () => {
      setIsLoading(true);
      const translation = await localeMapRef.current?.[locale]();
      if (isMounted && translation) {
        setIsLoading(false);
        setTranslations(translation);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [componentMap, locale]);

  function t(key: keyof T): string;
  function t(key: keyof T, opts: { interpolate?: boolean }): React.ReactNode;
  function t(
    key: keyof T,
    { interpolate }: { interpolate?: boolean } = {}
  ): React.ReactNode {
    const translation = translations?.[key];
    if (translations !== undefined && translation === undefined) {
      throw new Error(`Translation for key "${key}" not found`);
    }
    if (translation && interpolate) {
      return parseTranslation(translation, {
        ...defaultComponents,
        ...componentMap,
      });
    }
    return translation;
  }

  return { t, locale, setLocale, isLoading };
};

const tokenize = (str: string, tagNames: string[]) =>
  str
    .replace(new RegExp(`</?(${tagNames.join('|')})[^>]*>`, 'g'), '|$&|')
    .split('|');

const defaultComponents: { [tagName: string]: React.ComponentType } = {
  strong: (props: React.ComponentProps<'strong'>) => <strong {...props} />,
  em: (props: React.ComponentProps<'em'>) => <em {...props} />,
  b: (props: React.ComponentProps<'b'>) => <b {...props} />,
  i: (props: React.ComponentProps<'i'>) => <i {...props} />,
  p: (props: React.ComponentProps<'p'>) => <p {...props} />,
};

const isTagBegin = (token: string) =>
  token.match(/^<[a-zA-Z]/) && token.endsWith('>');

const isTagEnd = (token: string) =>
  token.match(/^<\/[a-zA-Z]/) && token.endsWith('>');

const getTagBeginName = (token: string) =>
  token.match(/^<([a-zA-Z]+)[^>]*>/)?.[1];

const getTagEndName = (token: string) =>
  token.match(/^<\/([a-zA-Z]+)[^>]*>/)?.[1];

const parseTranslation = (
  translation: string,
  componentMap: typeof defaultComponents
) => {
  const supportedTags = Object.keys(componentMap);
  const tokens = tokenize(translation, supportedTags);

  return parseTokens(tokens, componentMap);
};

const parseTokens = (
  tokens: string[],
  componentMap: typeof defaultComponents
) => {
  const parsed: React.ReactNode[] = [];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (isTagBegin(token)) {
      const tagName = getTagBeginName(token);
      const Component = tagName ? componentMap[tagName] : undefined;
      if (!Component) continue;

      let endIndex = i + 1;
      while (
        endIndex < tokens.length &&
        !isTagEnd(tokens[endIndex]) &&
        !getTagEndName(tokens[endIndex])
      ) {
        endIndex++;
      }

      const children = tokens.slice(i + 1, endIndex);
      parsed.push(
        <Component key={i}>{parseTokens(children, componentMap)}</Component>
      );

      i += endIndex - i;
      continue;
    }
    if (isTagEnd(token)) {
      continue;
    }
    parsed.push(token);
  }

  return parsed;
};
