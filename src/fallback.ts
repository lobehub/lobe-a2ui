import type { A2uiOperation, A2uiSurfaceRecord } from './types';

type Component = Record<string, unknown>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const HEADING = /^#{1,6}\s+/;
const clean = (text: string) =>
  text.replace(HEADING, '').replaceAll(/[*_`]/g, '').replaceAll(/\s+/g, ' ').trim();

/** @internal The data model the operations build, so `{ "@path": ... }` values can be read back. */
export const dataModelOf = (operations: A2uiOperation[]) => {
  let model: Record<string, unknown> = {};
  for (const operation of operations) {
    const update = operation.updateDataModel;
    if (!isRecord(update)) continue;
    const path = typeof update.path === 'string' ? update.path : '/';
    const segments = path.split('/').filter(Boolean);
    if (segments.length === 0) {
      if (isRecord(update.value)) model = { ...model, ...update.value };
      continue;
    }
    let target = model;
    for (const segment of segments.slice(0, -1)) {
      if (!isRecord(target[segment])) target[segment] = {};
      target = target[segment] as Record<string, unknown>;
    }
    target[segments.at(-1)!] = update.value;
  }
  return model;
};

export const resolve = (value: unknown, model: Record<string, unknown>): unknown => {
  if (!isRecord(value)) return value;
  const path = value['@path'] ?? value.path;
  if (typeof path !== 'string') return undefined;
  return path
    .split('/')
    .filter(Boolean)
    .reduce<unknown>(
      (node, segment) =>
        isRecord(node) || Array.isArray(node) ? (node as never)[segment] : undefined,
      model,
    );
};

/** Components in the order they are shown: from `root`, depth first. */
const shownOrder = (operations: A2uiOperation[]): Component[] => {
  const byId = new Map<string, Component>();
  for (const operation of operations) {
    const update = operation.updateComponents;
    if (!isRecord(update) || !Array.isArray(update.components)) continue;
    for (const component of update.components)
      if (isRecord(component) && typeof component.id === 'string')
        byId.set(component.id, component);
  }
  const ordered: Component[] = [];
  const seen = new Set<string>();
  const visit = (id: unknown) => {
    if (typeof id !== 'string' || seen.has(id)) return;
    const component = byId.get(id);
    if (!component) return;
    seen.add(id);
    ordered.push(component);
    for (const key of ['badge', 'child', 'trigger', 'content'] as const) visit(component[key]);
    // Accordion items may draw a child.
    if (Array.isArray(component.items))
      for (const item of component.items) if (isRecord(item)) visit(item.child);
    if (Array.isArray(component.children)) component.children.forEach(visit);
    // A template list draws its template once per item; its words are read once.
    else if (isRecord(component.children)) visit(component.children.componentId);
    if (Array.isArray(component.tabs))
      for (const tab of component.tabs) if (isRecord(tab)) visit(tab.child);
  };
  visit('root');
  return ordered;
};

const strings = (component: Component, model: Record<string, unknown>): string[] => {
  const text = (value: unknown) => {
    const resolved = resolve(value, model);
    return typeof resolved === 'string' || typeof resolved === 'number'
      ? [clean(String(resolved))]
      : [];
  };
  const list = (value: unknown) => {
    const resolved = resolve(value, model);
    return Array.isArray(resolved) ? resolved.filter(isRecord) : [];
  };
  switch (component.component) {
    case 'Card': {
      return [...text(component.title), ...text(component.description)];
    }
    case 'Metrics': {
      return list(component.items).map((item) =>
        [item.label, item.value, item.delta].filter((part) => part !== undefined).join(' '),
      );
    }
    case 'Callout': {
      return [...text(component.title), ...text(component.text), ...text(component.body)];
    }
    case 'Alert': {
      return [...text(component.title), ...text(component.message)];
    }
    case 'StatGroup': {
      return list(component.items).map((item) =>
        [...text(item.label), ...text(item.value), ...text(item.delta)].join(' '),
      );
    }
    case 'Stat':
    case 'Sparkline': {
      return [
        [...text(component.label), ...text(component.value), ...text(component.delta)].join(' '),
      ];
    }
    case 'KeyValueList': {
      return [
        ...text(component.title),
        ...list(component.items).map((item) =>
          [...text(item.label), ...text(item.value)].join(': '),
        ),
      ];
    }
    case 'Timeline': {
      return list(component.items).map((item) =>
        [...text(item.time), ...text(item.title)].join(' '),
      );
    }
    case 'Agenda': {
      return [
        ...text(component.title),
        ...list(component.days).flatMap((day) =>
          list(day.events).map((event) => [...text(event.time), ...text(event.title)].join(' ')),
        ),
      ];
    }
    case 'TagList': {
      const tags = resolve(component.tags, model);
      return Array.isArray(tags) ? [tags.map(String).join(', ')] : [];
    }
    case 'Badge':
    case 'Avatar': {
      return [...text(component.label), ...text(component.name), ...text(component.text)];
    }
    case 'Quote': {
      return [...text(component.text), ...text(component.author)];
    }
    case 'Kbd': {
      const keys = resolve(component.keys, model);
      return [
        [Array.isArray(keys) ? keys.map(String).join('+') : '', ...text(component.label)]
          .filter(Boolean)
          .join(' '),
      ];
    }
    case 'Gauge':
    case 'RadialProgress': {
      return [
        [
          ...text(component.title),
          ...text(component.label),
          ...text(component.display ?? component.value),
        ]
          .filter(Boolean)
          .join(' '),
      ];
    }
    case 'Markdown':
    case 'Title':
    case 'Caption':
    case 'Link': {
      return [...text(component.text)];
    }
    case 'LineChart':
    case 'AreaChart':
    case 'BarChart':
    case 'PieChart':
    case 'ScatterChart':
    case 'RadarChart':
    case 'Heatmap':
    case 'Treemap':
    case 'SankeyChart':
    case 'CandlestickChart':
    case 'DataTable': {
      return [...text(component.title), ...text(component.subtitle)];
    }
    case 'Table': {
      const keys = list(component.columns)
        .map((column) => column.key)
        .filter((key): key is string => typeof key === 'string');
      return [
        ...text(component.title),
        ...list(component.rows).map((row) =>
          keys
            .flatMap((key) => text(row[key]))
            .filter(Boolean)
            .join(', '),
        ),
      ];
    }
    case 'KeyValue': {
      return [
        ...text(component.title),
        ...list(component.items).map((item) =>
          [...text(item.label), ...text(item.value)].join(': '),
        ),
      ];
    }
    case 'Progress': {
      const value = Number(resolve(component.value, model));
      const max = Number(resolve(component.max, model) ?? 100) || 100;
      const amount = text(component.caption)[0] ?? `${Math.round((value / max) * 100)}%`;
      return [[...text(component.label), amount].join(' ')];
    }
    case 'Steps': {
      // A step's time or date leads it: "09:00 Arrive".
      return [
        ...text(component.title),
        ...list(component.items).map((item) => [...text(item.meta), ...text(item.title)].join(' ')),
      ];
    }
    case 'Statistic': {
      return [
        [
          ...text(component.label),
          [component.prefix, component.value, component.suffix]
            .map((part) => text(part)[0] ?? '')
            .join(''),
          ...text(component.delta),
        ]
          .filter(Boolean)
          .join(' '),
      ];
    }
    case 'Collapse':
    case 'Section':
    case 'LinkCard':
    case 'EmptyState': {
      return [...text(component.title)];
    }
    case 'Accordion': {
      return list(component.items).flatMap((item) => text(item.title));
    }
    case 'Heading': {
      return [...text(component.text), ...text(component.eyebrow), ...text(component.subtitle)];
    }
    case 'Rating': {
      const value = Number(resolve(component.value, model));
      return [
        [...text(component.label), Number.isFinite(value) ? `${value}/5` : ''].join(' ').trim(),
      ];
    }
    case 'AvatarGroup': {
      return [...text(component.label)];
    }
    case 'ComparisonTable': {
      const options = Array.isArray(component.options) ? component.options.map(String) : [];
      return [...text(component.title), options.join(' / ')].filter(Boolean);
    }
    case 'Tabs': {
      return list(component.tabs).flatMap((tab) => text(tab.title));
    }
    case 'Image':
    case 'AudioPlayer': {
      return [...text(component.description)];
    }
    case 'ChoicePicker': {
      return [...text(component.label), ...list(component.options).flatMap((o) => text(o.label))];
    }
    case 'Text':
    case 'Tag':
    case 'Chart': {
      return [...text(component.text), ...text(component.title)];
    }
    case 'List': {
      const items = resolve(component.items, model);
      return Array.isArray(items)
        ? items.map((item) =>
            isRecord(item)
              ? [...text(item.label), ...text(item.value)].join(': ')
              : (text(item)[0] ?? ''),
          )
        : [];
    }
    case 'ListItem': {
      return [[...text(component.label), ...text(component.value)].join(': ')];
    }
    case 'FollowUp': {
      const items = resolve(component.items, model);
      return Array.isArray(items)
        ? items.flatMap((item) => (isRecord(item) ? text(item.label) : text(item)))
        : [];
    }
    case 'MapView':
    case 'PlaceList': {
      const places = list(component.markers ?? component.places);
      return [...text(component.title), places.flatMap((p) => text(p.name)).join(', ')].filter(
        Boolean,
      );
    }
    case 'RouteMap': {
      return [[...text(component.from), ...text(component.to)].join(' → ')];
    }
    case 'WeatherCard': {
      return [
        [...text(component.location), ...text(component.temp), ...text(component.condition)].join(
          ' ',
        ),
      ];
    }
    case 'StockTicker': {
      return [[...text(component.symbol), ...text(component.price)].join(' ')];
    }
    default: {
      // Components named by a title, a name or a label: entity, profile, event, recipe and
      // receipt cards, form fields, citations.
      for (const key of ['title', 'name', 'merchant', 'label', 'text'] as const) {
        const found = text(component[key]);
        if (found.length > 0) return [...found, ...text(component.subtitle)];
      }
      return [];
    }
  }
};

/**
 * The surface's heading: its Heading, else the Card title, else the first heading Text, else the
 * first callout.
 */
export const surfaceTitle = (operations: A2uiOperation[]): string | undefined => {
  const model = dataModelOf(operations);
  const components = shownOrder(operations);
  const heading = components.find((component) => component.component === 'Heading');
  const headingText = heading && resolve(heading.text, model);
  if (typeof headingText === 'string' && headingText.trim()) return clean(headingText);
  for (const component of components) {
    if (component.component === 'Card') {
      const title = resolve(component.title, model);
      if (typeof title === 'string' && title.trim()) return clean(title);
    }
  }
  for (const component of components) {
    const text = resolve(component.text, model);
    if (component.component === 'Text' && typeof text === 'string' && HEADING.test(text))
      return clean(text);
  }
  const callout = components.find((component) => component.component === 'Callout');
  const title = callout && resolve(callout.title, model);
  return typeof title === 'string' && title.trim() ? clean(title) : undefined;
};

/** The surface's words in reading order, joined into one line and cut at `max` characters. */
export const surfaceText = (operations: A2uiOperation[], max = 600): string => {
  const model = dataModelOf(operations);
  const line = shownOrder(operations)
    .flatMap((component) => strings(component, model))
    .filter(Boolean)
    .join(' · ');
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

/**
 * One surface as text, for places that can't draw it: an Agent reading history back, a bot
 * platform, a notification. `fallback` names what to say when the surface has no words.
 */
export const surfaceToText = (
  record: Pick<A2uiSurfaceRecord, 'operations' | 'title'>,
  options: { fallback?: string; max?: number } = {},
): string => {
  return surfaceText(record.operations, options.max) || record.title || options.fallback || '';
};
