import { Accordion, Divider, Flexbox, Grid, Modal, Tabs, Text } from '@lobehub/ui';
import { Surface } from '@lobehub/ui/dashboard';
import { useState } from 'react';

import { A2UI_LIST_LIMITS } from '../../constants';
import {
  ALIGN,
  CardDepthContext,
  childrenOf,
  define,
  JUSTIFY,
  styles,
  useCardDepth,
} from './shared';

/**
 * A Card as the root is the surface's card: a @lobehub/ui Surface with a padded body. Inside
 * another card it is a filled tile with no border, so a grid of cards reads as groups in one card
 * rather than boxes in a box.
 */
export const CardView = define('Card', ({ props, buildChild }) => {
  const depth = useCardDepth();
  const child = <CardDepthContext value={depth + 1}>{buildChild(props.child)}</CardDepthContext>;
  return depth === 0 ? (
    <Surface padded>{child}</Surface>
  ) : (
    <div className={styles.tile}>{child}</div>
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

export const GridView = define('Grid', ({ props, buildChild }) => (
  // Equal columns while each stays at least 200px wide; fewer, then one, on narrow cards.
  <Grid gap={12} maxItemWidth={200} rows={props.columns ?? 2}>
    {childrenOf(props.children, buildChild).slice(0, A2UI_LIST_LIMITS.Grid.children)}
  </Grid>
));

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
