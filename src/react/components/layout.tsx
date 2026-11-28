import { Accordion, cx, Divider, Flexbox, Modal, Tabs, Text } from '@lobehub/ui';
import type { KeyboardEvent, MouseEvent } from 'react';
import { useState } from 'react';

import { A2UI_LIST_LIMITS } from '../../constants';
import { a2ui } from './a2ui';
import {
  ALIGN,
  CardDepthContext,
  childrenOf,
  define,
  JUSTIFY,
  styles,
  useCardDepth,
} from './shared';

/** Controls inside a clickable card keep their own click: a link opens once, not twice. */
const INNER_CONTROL = 'a, button, input, textarea, select, [role="button"]';

/**
 * A Card is the official boxed panel (`.a2-card`): surface, hairline, 14px corners, a soft shadow.
 * With an action the whole card is one button: the border strengthens on hover, a focus ring shows
 * from the keyboard, and a link or button inside still does its own thing.
 */
export const CardView = define('Card', ({ props, buildChild }) => {
  const depth = useCardDepth();
  const child = <CardDepthContext value={depth + 1}>{buildChild(props.child)}</CardDepthContext>;
  const action = typeof props.action === 'function' ? (props.action as () => void) : undefined;
  if (!action) return <div className={cx(a2ui.card, styles.cardBody)}>{child}</div>;
  return (
    <div
      className={cx(a2ui.card, a2ui.pressable, styles.cardBody)}
      role="button"
      tabIndex={0}
      onClick={(event: MouseEvent<HTMLDivElement>) => {
        const hit = (event.target as HTMLElement).closest(INNER_CONTROL);
        if (hit && hit !== event.currentTarget) return;
        action();
      }}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          action();
        }
      }}
    >
      {child}
    </div>
  );
});

export const ColumnView = define('Column', ({ props, buildChild }) => (
  <Flexbox
    align={ALIGN[(props.align ?? 'stretch') as keyof typeof ALIGN]}
    gap={useCardDepth() > 1 ? 8 : 12}
    justify={JUSTIFY[(props.justify ?? 'start') as keyof typeof JUSTIFY]}
    style={{ minWidth: 0 }}
  >
    {childrenOf(props.children, buildChild)}
  </Flexbox>
));

export const RowView = define('Row', ({ props, buildChild }) => (
  <Flexbox
    horizontal
    align={ALIGN[(props.align ?? 'stretch') as keyof typeof ALIGN]}
    gap={8}
    justify={JUSTIFY[(props.justify ?? 'start') as keyof typeof JUSTIFY]}
    style={{ minWidth: 0, width: '100%' }}
    wrap="wrap"
  >
    {childrenOf(props.children, buildChild)}
  </Flexbox>
));

type TabInput = { child: string; title?: unknown };

export const TabsView = define('Tabs', ({ props, buildChild }) => {
  const tabs = (Array.isArray(props.tabs) ? props.tabs : []) as TabInput[];
  const [active, setActive] = useState('0');
  return (
    <Tabs
      activeKey={active}
      items={tabs.map((tab, index) => ({
        children: String(index) === active ? buildChild(tab.child) : null,
        key: String(index),
        label: String(tab.title ?? ''),
      }))}
      onChange={setActive}
    />
  );
});

/** Shows its trigger; clicking it opens the content in a @lobehub/ui Modal. */
export const ModalView = define('Modal', ({ props, buildChild }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <span
        className={styles.trigger}
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') setOpen(true);
        }}
      >
        {buildChild(props.trigger)}
      </span>
      <Modal footer={null} open={open} title={false} onCancel={() => setOpen(false)}>
        {open ? buildChild(props.content) : null}
      </Modal>
    </>
  );
});

export const DividerView = define('Divider', ({ props }) =>
  props.axis === 'vertical' ? (
    <div aria-hidden className={styles.vDivider} />
  ) : (
    <Divider style={{ margin: 0 }} />
  ),
);

/**
 * Equal columns that step down with the surface's width, as the official playground's do: 4 to 2
 * under 520px, 3 to 2 under 400px, and to 1 under 260px.
 */
export const GridView = define('Grid', ({ props, buildChild }) => {
  const columns = Math.max(1, Math.min(4, Number(props.columns ?? 2) || 2));
  return (
    <div className={styles.grid} data-columns={columns}>
      {childrenOf(props.children, buildChild).slice(0, A2UI_LIST_LIMITS.Grid.children)}
    </div>
  );
});

/** A section that opens from its header (@lobehub/ui Accordion with one item). */
export const CollapseView = define('Collapse', ({ props, buildChild }) => (
  <Accordion
    defaultValue={props.defaultOpen ? ['content'] : []}
    variant="outlined"
    items={[
      {
        children: buildChild(props.child),
        key: 'content',
        title: <Text weight={500}>{String(props.title ?? '')}</Text>,
      },
    ]}
  />
));
