import { A2uiSurface } from '@a2ui/react';
import { MessageProcessor } from '@a2ui/web_core';
import { Catalog } from '@a2ui/web_core/v1_0';
import { createStaticStyles, cx, Flexbox, Text } from '@lobehub/ui';
import { Surface } from '@lobehub/ui/dashboard';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { A2UI_CATALOG_ID, A2UI_VERSION } from '../constants';
import { upgradeLegacyOperations } from '../legacy';
import type { A2uiActionPayload, A2uiSurfaceRecord, A2uiSurfaceState } from '../types';
import { createLobeFunctions, LOBE_COMPONENTS } from './components';
import { useA2uiHost } from './host';

/** One rendering catalog per locale: formatNumber, formatDate and the rest read it. */
const lobeCatalogs = new Map<string, Catalog<never>>();
const getLobeCatalog = (locale: string | undefined) => {
  const key = locale ?? '';
  let catalog = lobeCatalogs.get(key);
  if (!catalog)
    lobeCatalogs.set(
      key,
      (catalog = new Catalog(
        A2UI_CATALOG_ID,
        A2UI_VERSION,
        LOBE_COMPONENTS as never,
        createLobeFunctions(locale) as never,
      ) as Catalog<never>),
    );
  return catalog;
};

/** The root component's name: a Card root is the card itself; any other root gets one. */
const rootComponentOf = (record: A2uiSurfaceRecord) => {
  for (const operation of record.operations) {
    const update = operation.updateComponents as { components?: unknown[] } | undefined;
    const root = update?.components?.find(
      (component) => (component as { id?: unknown })?.id === 'root',
    ) as { component?: unknown } | undefined;
    if (root) return root.component;
  }
  return undefined;
};

const styles = createStaticStyles(({ css }) => ({
  root: css`
    width: 100%;
    max-width: 680px;
  `,
  submitted: css`
    pointer-events: none;
    opacity: 0.64;
  `,
}));

export interface SurfaceViewProps {
  /** Called when a person triggers an action; the host sends it to the Agent. */
  onAction?: (action: A2uiActionPayload) => void;
  record: A2uiSurfaceRecord;
  /** A submitted surface stays visible but takes no more input. */
  state?: A2uiSurfaceState;
}

/**
 * Draws one stored surface. Each record replays into its own processor, so surfaces in a
 * conversation never share data models, and a record that fails to replay falls back to its text.
 */
export const SurfaceView = memo<SurfaceViewProps>(({ record, state, onAction }) => {
  const locale = useA2uiHost()?.locale;
  const processor = useMemo(() => {
    const next = new MessageProcessor([getLobeCatalog(locale)] as never);
    try {
      // Cards stored before 1.1 are rewritten into today's catalog before they replay.
      next.processMessages(upgradeLegacyOperations(record.operations, locale) as never);
    } catch {
      return null;
    }
    return next;
  }, [record, locale]);
  const surface = processor?.model.surfacesMap.get(record.surfaceId) ?? null;

  useEffect(() => {
    if (!processor || !onAction) return;
    const subscription = processor.model.onAction.subscribe((action) =>
      onAction(action as A2uiActionPayload),
    );
    return () => subscription.unsubscribe();
  }, [processor, onAction]);

  if (!surface) return record.fallback ? <Text type="secondary">{record.fallback}</Text> : null;

  const submitted = state?.status === 'submitted';
  return (
    <div
      aria-disabled={submitted || undefined}
      className={cx(styles.root, submitted && styles.submitted)}
    >
      {rootComponentOf(record) === 'Card' ? (
        <A2uiSurface surface={surface as never} />
      ) : (
        <Surface padded>
          <A2uiSurface surface={surface as never} />
        </Surface>
      )}
    </div>
  );
});

SurfaceView.displayName = 'A2uiSurfaceView';

/**
 * One stored surface wired to the enclosing host: its actions go to `host.sendAction`, and once
 * one is accepted (or the record says it was submitted) the surface turns read-only. Hosts render
 * this instead of handling submission themselves.
 */
export const HostedSurface = memo<{ record: A2uiSurfaceRecord }>(({ record }) => {
  const host = useA2uiHost();
  const [local, setLocal] = useState<A2uiSurfaceState>();
  // Set synchronously, so a second click while the first is sending, or before the surface
  // re-renders read-only, sends nothing; cleared if the host refused, so the person can retry.
  const busy = useRef(false);
  const state = local ?? record.state;
  const open = state?.status !== 'submitted';
  const onAction = useMemo(
    () =>
      host?.canAct && open
        ? async (action: A2uiActionPayload) => {
            if (busy.current) return;
            busy.current = true;
            let accepted = false;
            try {
              accepted = await host.sendAction(action, record);
            } finally {
              busy.current = accepted;
            }
            if (accepted)
              setLocal({ action, status: 'submitted', submittedAt: new Date().toISOString() });
          }
        : undefined,
    [host, open, record],
  );
  return <SurfaceView record={record} state={state} onAction={onAction} />;
});

HostedSurface.displayName = 'A2uiHostedSurface';

/** A message's or a step's surfaces, in order, each wired to the enclosing host. */
export const SurfaceList = memo<{ gap?: number; surfaces: readonly A2uiSurfaceRecord[] }>(
  ({ surfaces, gap = 8 }) =>
    surfaces.length === 0 ? null : (
      <Flexbox gap={gap}>
        {surfaces.map((surface) => (
          <HostedSurface key={surface.surfaceId} record={surface} />
        ))}
      </Flexbox>
    ),
);

SurfaceList.displayName = 'A2uiSurfaceList';
