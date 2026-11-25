import { A2uiSurface } from '@a2ui/react';
import { MessageProcessor } from '@a2ui/web_core';
import { Catalog } from '@a2ui/web_core/v1_0';
import { createStaticStyles, cx, Text } from '@lobehub/ui';
import { memo, useEffect, useMemo } from 'react';

import { A2UI_CATALOG_ID, A2UI_VERSION } from '../catalog';
import type { A2uiActionPayload, A2uiSurfaceRecord, A2uiSurfaceState } from '../types';
import { LOBE_COMPONENTS } from './components';

let lobeCatalog: Catalog<never> | undefined;
const getLobeCatalog = () =>
  (lobeCatalog ??= new Catalog(
    A2UI_CATALOG_ID,
    A2UI_VERSION,
    LOBE_COMPONENTS as never,
  ) as Catalog<never>);

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
  const processor = useMemo(() => {
    const next = new MessageProcessor([getLobeCatalog()] as never);
    try {
      next.processMessages(record.operations as never);
    } catch {
      return null;
    }
    return next;
  }, [record]);
  const surface = processor?.model.surfacesMap.get(record.surfaceId) ?? null;

  useEffect(() => {
    if (!processor || !onAction) return;
    const subscription = processor.model.onAction.subscribe((action) =>
      onAction({ context: action.context, name: action.name, surfaceId: action.surfaceId }),
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
      <A2uiSurface surface={surface as never} />
    </div>
  );
});

SurfaceView.displayName = 'A2uiSurfaceView';

