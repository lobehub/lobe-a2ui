import type { ITEM_STATUSES } from '../catalog';

export type A2uiStatusLabels = Record<(typeof ITEM_STATUSES)[number], string>;

/** Every word a surface shows that the Agent didn't write. */
export interface A2uiLabels {
  /** Placeholder of a filterable ChoicePicker's search box. */
  filter: string;
  /** Items status tags. */
  status: A2uiStatusLabels;
}

const EN_US: A2uiLabels = {
  filter: 'Filter',
  status: {
    blocked: 'Blocked',
    done: 'Done',
    human: 'Needs you',
    new: 'New',
    watch: 'Watch',
    worse: 'Worse',
  },
};

const ZH_CN: A2uiLabels = {
  filter: '筛选',
  status: {
    blocked: '阻塞',
    done: '已完成',
    human: '需人工',
    new: '新增',
    watch: '观察',
    worse: '恶化',
  },
};

/** Built-in labels by locale. A host picks one with `A2uiHost.locale`; others fall back to English. */
export const A2UI_LOCALES: Record<string, A2uiLabels> = {
  'en-US': EN_US,
  'zh-CN': ZH_CN,
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
  overrides?: { filter?: string; status?: Partial<A2uiStatusLabels> },
): A2uiLabels => {
  const base = A2UI_LOCALES[resolveA2uiLocale(locale)];
  return {
    filter: overrides?.filter ?? base.filter,
    status: { ...base.status, ...overrides?.status },
  };
};
