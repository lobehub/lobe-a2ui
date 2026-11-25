import { Divider, Flexbox, Grid, Modal, Tabs } from '@lobehub/ui';
import { Surface } from '@lobehub/ui/dashboard';
import { useState } from 'react';

import { A2UI_LIST_LIMITS } from '../../catalog';
import { ALIGN, childrenOf, define, JUSTIFY, styles } from './shared';

/**
 * A Card is a @lobehub/ui Surface: with a title, description or badge it gets the product's card
 * heading and a padded body; nested, it draws as an inner outlined card.
 */
export const CardView = define('Card', ({ props, buildChild }) => (
  <Surface
    padded
    description={props.description ? String(props.description) : undefined}
    extra={props.badge ? buildChild(props.badge) : undefined}
    title={props.title ? String(props.title) : undefined}
  >
    {buildChild(props.child)}
  </Surface>
));

export const ColumnView = define('Column', ({ props, buildChild }) => (
  <Flexbox
    align={ALIGN[(props.align ?? 'stretch') as keyof typeof ALIGN]}
    gap={12}
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

/** A scrolling list; horizontal lists hide the scrollbar and keep each child narrow. */
export const ListView = define('List', ({ props, buildChild }) => {
  const horizontal = props.direction === 'horizontal';
  return (
    <Flexbox
      align={ALIGN[(props.align ?? 'stretch') as keyof typeof ALIGN]}
      className={horizontal ? styles.hList : undefined}
      gap={horizontal ? 12 : 8}
      horizontal={horizontal}
      style={horizontal ? undefined : { maxHeight: 480, overflowY: 'auto' }}
    >
      {childrenOf(props.children, buildChild)}
    </Flexbox>
  );
});

export const GridView = define('Grid', ({ props, buildChild }) => (
  // Equal columns while each stays at least 200px wide; fewer, then one, on narrow cards.
  <Grid gap={12} maxItemWidth={200} rows={props.columns ?? 2}>
    {childrenOf(props.children, buildChild).slice(0, A2UI_LIST_LIMITS.Grid.children)}
  </Grid>
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
