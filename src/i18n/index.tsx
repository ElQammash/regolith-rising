import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import ar from './ar';
import en, { type Messages } from './en';

export type Lang = 'en' | 'ar';
export const MESSAGES: Record<Lang, Messages> = { en, ar };

type Params = Record<string, string | number>;

function lookup(messages: Messages, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (node && typeof node === 'object' && part in (node as object)) node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === 'string' ? node : undefined;
}

export function formatNumber(lang: Lang, n: number, digits = 0): string {
  return new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
}

export function translate(lang: Lang, key: string, params?: Params): string {
  const raw = lookup(MESSAGES[lang], key) ?? lookup(en, key) ?? key;
  if (!params) return raw;
  const out = raw.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = params[k];
    if (v === undefined) return `{${k}}`;
    const num = typeof v === 'number' ? formatNumber(lang, v, Number.isInteger(v) ? 0 : 1) : v;
    // Arabic counted nouns: 3-10 take the plural, other counts take the singular.
    return typeof v === 'number' ? `${num}⁣${lang === 'ar' && (v < 3 || v > 10) ? 'S' : 'P'}` : num;
  });
  return out
    .replace(/⁣S (دورات|خزانات)/g, (_, w: string) => ` ${AR_SINGULAR[w]}`)
    .replace(/⁣[SP]/g, '');
}

const AR_SINGULAR: Record<string, string> = { دورات: 'دورة', خزانات: 'خزان' };

interface I18n {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  t: (key: string, params?: Params) => string;
  n: (x: number, digits?: number) => string;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const value = useMemo<I18n>(
    () => ({
      lang,
      dir: MESSAGES[lang].meta.dir as 'ltr' | 'rtl',
      t: (key, params) => translate(lang, key, params),
      n: (x, digits = 0) => formatNumber(lang, x, digits),
    }),
    [lang],
  );
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = value.dir;
    document.title = MESSAGES[lang].app.title;
  }, [lang, value.dir]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside provider');
  return v;
}
