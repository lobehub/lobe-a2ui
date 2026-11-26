import { createContext, type ReactNode, use, useMemo } from 'react';

import type { A2uiActionPayload, A2uiSurfaceRecord } from '../types';
import { type A2uiLabels, a2uiLabels } from './locale';

export type { A2uiLabels } from './locale';
export { A2UI_LOCALES, a2uiLabels, resolveA2uiLocale } from './locale';

/**
 * What only the host knows: where a card's actions go, whether this person may act, and the
 * reader's language. Each place that shows cards (a topic, a Channel) provides its own, so a card
 * renders the same everywhere and never reaches into an app store. `sendAction` resolves true once
 * the action was accepted, which turns the card read-only.
 */
export interface A2uiHost {
  canAct: boolean;
  /** Overrides of the built-in labels. */
  labels?: Partial<A2uiLabels>;
  /** The reader's language tag (`en-US`, `zh-CN`, …): picks the built-in labels and formats numbers and dates. */
  locale?: string;
  sendAction: (action: A2uiActionPayload, surface: A2uiSurfaceRecord) => Promise<boolean>;
}

const A2uiHostContext = createContext<A2uiHost | undefined>(undefined);

export const A2uiHostProvider = ({ children, value }: { children: ReactNode; value: A2uiHost }) => (
  <A2uiHostContext value={value}>{children}</A2uiHostContext>
);

/** The enclosing host, or undefined where cards are read-only (shares, previews). */
export const useA2uiHost = () => use(A2uiHostContext);

/** The labels to show: built-in for the host's locale, with its overrides. */
export const useA2uiLabels = (): A2uiLabels => {
  const host = use(A2uiHostContext);
  const locale = host?.locale;
  const labels = host?.labels;
  return useMemo(() => a2uiLabels(locale, labels), [locale, labels]);
};
