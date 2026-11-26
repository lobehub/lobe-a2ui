/**
 * The only words a surface shows that the Agent didn't write: interface chrome with no Agent
 * equivalent. Everything a person reads as content comes from the Agent.
 */
export interface A2uiLabels {
  /** A Table with no rows. */
  empty: string;
  /** Placeholder of a filterable ChoicePicker's search box. */
  filter: string;
}

/** Built-in labels by locale. A host picks one with `A2uiHost.locale`; others fall back to English. */
export const A2UI_LOCALES: Record<string, A2uiLabels> = {
  'en-US': { empty: 'No rows', filter: 'Filter' },
  'zh-CN': { empty: '暂无数据', filter: '筛选' },
};

export const DEFAULT_LOCALE = 'en-US';

/** The built-in locale for a language tag: exact, then by language (`zh-TW` → `zh-CN`), then English. */
export const resolveA2uiLocale = (locale: string | undefined): string => {
  if (!locale) return DEFAULT_LOCALE;
  if (A2UI_LOCALES[locale]) return locale;
  const language = locale.split(/[_-]/)[0].toLowerCase();
  return (
    Object.keys(A2UI_LOCALES).find((tag) => tag.split('-')[0].toLowerCase() === language) ??
    DEFAULT_LOCALE
  );
};

/** Labels for a locale, with a host's overrides on top. */
export const a2uiLabels = (
  locale: string | undefined,
  overrides?: Partial<A2uiLabels>,
): A2uiLabels => ({
  ...A2UI_LOCALES[resolveA2uiLocale(locale)],
  ...overrides,
});
