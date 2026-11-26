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
      return [...text(component.title), ...text(component.body)];
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
        ]
          .filter(Boolean)
          .join(' '),
      ];
    }
    case 'Collapse': {
      return [...text(component.title)];
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
    default: {
      return [...text(component.label)];
    }
  }
};

/** The surface's heading: the Card title, else the first heading Text, else the first callout. */
export const surfaceTitle = (operations: A2uiOperation[]): string | undefined => {
  const model = dataModelOf(operations);
  const components = shownOrder(operations);
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
