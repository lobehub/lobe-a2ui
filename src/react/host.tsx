import { createContext, type ReactNode, use } from 'react';

import type { ITEM_STATUSES } from '../catalog';
import type { A2uiActionPayload, A2uiSurfaceRecord } from '../types';

export type A2uiStatusLabels = Record<(typeof ITEM_STATUSES)[number], string>;

/** English defaults; a host passes its own translations through `A2uiHost.statusLabels`. */
export const DEFAULT_STATUS_LABELS: A2uiStatusLabels = {
  blocked: 'Blocked',
  done: 'Done',
  human: 'Needs you',
  new: 'New',
  watch: 'Watch',
  worse: 'Worse',
};

/**
 * Where a card's actions go, and the words it shows that are not the Agent's. Each place that
 * shows cards (a topic, a Channel) provides its own, so a card renders the same everywhere and
 * never reaches into an app store. `sendAction` resolves true once the action was accepted, which
 * turns the card read-only.
 */
export interface A2uiHost {
  canAct: boolean;
  sendAction: (action: A2uiActionPayload, surface: A2uiSurfaceRecord) => Promise<boolean>;
  /** Labels of Items statuses, in the host's language. Missing ones fall back to English. */
  statusLabels?: Partial<A2uiStatusLabels>;
}

const A2uiHostContext = createContext<A2uiHost | undefined>(undefined);

export const A2uiHostProvider = ({ children, value }: { children: ReactNode; value: A2uiHost }) => (
  <A2uiHostContext value={value}>{children}</A2uiHostContext>
);

/** The enclosing host, or undefined where cards are read-only (shares, previews). */
export const useA2uiHost = () => use(A2uiHostContext);

/** Status labels for Items, from the host when it gives them. */
export const useA2uiStatusLabels = (): A2uiStatusLabels => {
  const labels = use(A2uiHostContext)?.statusLabels;
  return labels ? { ...DEFAULT_STATUS_LABELS, ...labels } : DEFAULT_STATUS_LABELS;
};
