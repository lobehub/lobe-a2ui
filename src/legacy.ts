/**
 * Cards stored before 1.1 used LobeHub's first catalog: a Card with its own title, description and
 * badge, and Items and Bars components that the official catalog has no place for. Hosts keep those
 * cards in old messages, so before replaying a stored surface its components are rewritten into
 * today's catalog. Surfaces without legacy components pass through unchanged.
 */

type Component = Record<string, unknown> & { component?: unknown; id?: unknown };
type Operation = Record<string, unknown>;

const STATUS_TONE: Record<string, string> = {
  blocked: 'error',
  done: 'success',
  human: 'warning',
  new: 'info',
  watch: 'warning',
  worse: 'error',
};

const STATUS_LABEL: Record<'en' | 'zh', Record<string, string>> = {
  en: {
    blocked: 'Blocked',
    done: 'Done',
    human: 'Needs you',
    new: 'New',
    watch: 'Watch',
    worse: 'Worse',
  },
  zh: { blocked: '受阻', done: '已完成', human: '需要你', new: '新增', watch: '观察', worse: '恶化' },
};

const isLegacyCard = (component: Component) =>
  component.component === 'Card' &&
  ('title' in component || 'description' in component || 'badge' in component);

const isLegacy = (component: Component) =>
  isLegacyCard(component) || component.component === 'Items' || component.component === 'Bars';

const componentsOf = (operation: Operation) =>
  (operation.updateComponents as { components?: unknown } | undefined)?.components;

/** Whether stored operations use components of the pre-1.1 catalog. */
export const hasLegacyComponents = (operations: readonly Operation[]): boolean =>
  operations.some((operation) => {
    const components = componentsOf(operation);
    return Array.isArray(components) && components.some((c) => isLegacy(c as Component));
  });

const text = (id: string, value: string, variant?: string): Component => ({
  component: 'Text',
  id,
  text: value,
  ...(variant && { variant }),
});

const upgradeCard = (card: Component): Component[] => {
  const id = String(card.id);
  const { badge, description, title, ...rest } = card;
  const column = `${id}__legacy`;
  const children: string[] = [];
  const added: Component[] = [];
  if (typeof title === 'string' && title) {
    const titleId = `${column}_title`;
    added.push(text(titleId, `#### ${title}`));
    if (typeof badge === 'string' && badge) {
      const head = `${column}_head`;
      added.push({
        align: 'center',
        children: [titleId, badge],
        component: 'Row',
        id: head,
        justify: 'spaceBetween',
      });
      children.push(head);
    } else children.push(titleId);
  } else if (typeof badge === 'string' && badge) children.push(badge);
  if (typeof description === 'string' && description) {
    added.push(text(`${column}_desc`, description, 'caption'));
    children.push(`${column}_desc`);
  }
  if (typeof rest.child === 'string') children.push(rest.child);
  return [
    { ...rest, child: column },
    { children, component: 'Column', id: column },
    ...added,
  ];
};

const upgradeItems = (items: Component, labels: Record<string, string>): Component[] => {
  const id = String(items.id);
  const children: string[] = [];
  const added: Component[] = [];
  if (typeof items.title === 'string' && items.title) {
    added.push(text(`${id}_title`, `#### ${items.title}`));
    children.push(`${id}_title`);
  }
  const list = Array.isArray(items.items) ? (items.items as Record<string, unknown>[]) : [];
  list.forEach((item, index) => {
    const row = `${id}_${index}`;
    const status = typeof item.status === 'string' ? item.status : undefined;
    const body: string[] = [`${row}_title`];
    added.push(text(`${row}_title`, String(item.title ?? '')));
    if (typeof item.detail === 'string' && item.detail) {
      added.push(text(`${row}_detail`, item.detail, 'caption'));
      body.push(`${row}_detail`);
    }
    const rowChildren: string[] = [];
    if (status) {
      added.push({
        color: STATUS_TONE[status] ?? 'default',
        component: 'Tag',
        id: `${row}_tag`,
        text: labels[status] ?? status,
      });
      rowChildren.push(`${row}_tag`);
    }
    added.push({ children: body, component: 'Column', id: `${row}_body`, weight: 1 });
    rowChildren.push(`${row}_body`);
    added.push({ align: 'start', children: rowChildren, component: 'Row', id: row });
    children.push(row);
  });
  return [{ children, component: 'Column', id }, ...added];
};

const upgradeBars = (bars: Component): Component[] => {
  const id = String(bars.id);
  const values = Array.isArray(bars.values) ? (bars.values as unknown[]) : [];
  const labels = Array.isArray(bars.labels) ? (bars.labels as unknown[]) : [];
  const unit = typeof bars.unit === 'string' && bars.unit ? bars.unit : undefined;
  const series = unit ?? 'value';
  const chart: Component = {
    categories: [series],
    component: 'Chart',
    data: values.map((value, index) => ({
      [series]: Number(value) || 0,
      label: String(labels[index] ?? index + 1),
    })),
    id: `${id}_chart`,
    index: 'label',
    type: 'bar',
    ...(typeof bars.title === 'string' && bars.title && { title: bars.title }),
    ...(unit && { unit }),
  };
  const children = [chart.id as string];
  const added: Component[] = [chart];
  if (typeof bars.caption === 'string' && bars.caption) {
    added.push(text(`${id}_caption`, bars.caption, 'caption'));
    children.push(`${id}_caption`);
  }
  return [{ children, component: 'Column', id }, ...added];
};

/**
 * Stored operations rewritten into today's catalog: a titled Card becomes a Card around a Column
 * with its heading, Items a list of rows with status tags (labelled in `locale`), Bars a bar Chart.
 */
export const upgradeLegacyOperations = <T extends Operation>(
  operations: readonly T[],
  locale?: string,
): T[] => {
  if (!hasLegacyComponents(operations)) return operations as T[];
  const labels = STATUS_LABEL[locale?.toLowerCase().startsWith('zh') ? 'zh' : 'en'];
  return operations.map((operation) => {
    const components = componentsOf(operation);
    if (!Array.isArray(components)) return operation;
    const next = (components as Component[]).flatMap((component) => {
      if (isLegacyCard(component)) return upgradeCard(component);
      if (component.component === 'Items') return upgradeItems(component, labels);
      if (component.component === 'Bars') return upgradeBars(component);
      return [component];
    });
    return {
      ...operation,
      updateComponents: { ...(operation.updateComponents as object), components: next },
    };
  });
};
