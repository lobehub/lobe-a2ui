import { describe, expect, it } from 'vitest';

import {
  A2UI_BASIC_COMPONENT_NAMES,
  A2UI_CATALOG_DOCUMENT,
  A2UI_CATALOG_ID,
  A2UI_COMPONENT_NAMES,
  A2UI_FUNCTION_NAMES,
  BASIC_CATALOG_DOCUMENT,
} from './catalog';
import { surfaceToText } from './fallback';
import { loadExamples } from './prompt';
import { validateSurface } from './validate';

const report = [
  { createSurface: { catalogId: 'anything', surfaceId: 'dc' }, version: '1.0' },
  {
    updateComponents: {
      components: [
        { child: 'col', component: 'Card', id: 'root' },
        { children: ['h', 'm', 'p1', 'go'], component: 'Column', id: 'col' },
        { component: 'Text', id: 'h', text: '#### DC daily check' },
        { component: 'Metrics', id: 'm', items: { '@path': '/metrics' } },
        { component: 'Callout', id: 'p1', level: 'error', title: 'P1 · balance exhausted' },
        {
          action: { event: { name: 'rotateKey' } },
          child: 'goL',
          component: 'Button',
          id: 'go',
          variant: 'primary',
        },
        { component: 'Text', id: 'goL', text: 'Rotate key' },
      ],
      surfaceId: 'dc',
    },
    version: '1.0',
  },
  {
    updateDataModel: {
      path: '/',
      surfaceId: 'dc',
      value: { metrics: [{ delta: '+62%', label: 'error-log', tone: 'bad', value: '225' }] },
    },
    version: '1.0',
  },
];

describe('validateSurface', () => {
  it('stores a valid surface on our catalog with a title and a text fallback', () => {
    const result = validateSurface(report);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.surfaceId).toBe('dc');
    expect(result.record.title).toBe('DC daily check');
    expect((result.record.operations[0].createSurface as { catalogId: string }).catalogId).toBe(
      A2UI_CATALOG_ID,
    );
    expect(surfaceToText(result.record)).toBe(
      'DC daily check · error-log 225 +62% · P1 · balance exhausted · Rotate key',
    );
  });

  it('accepts operations sent as one JSON string, the legacy "v1.0" spelling and no createSurface', () => {
    const result = validateSurface(
      JSON.stringify([
        {
          updateComponents: {
            components: [{ component: 'Text', id: 'root', text: '#### Hello' }],
            surfaceId: 's',
          },
          version: 'v1.0',
        },
      ]),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.record.operations.map((operation) => operation.version)).toEqual(['1.0', '1.0']);
    expect(result.record.operations[0]).toHaveProperty('createSurface');
    expect(result.record.title).toBe('Hello');
  });

  it('hands back errors the Agent can act on', () => {
    const unknown = validateSurface([
      {
        updateComponents: { components: [{ component: 'Map', id: 'root' }], surfaceId: 's' },
        version: '1.0',
      },
    ]);
    expect(unknown).toMatchObject({ ok: false });
    expect(!unknown.ok && unknown.errors[0]).toMatch(/Unknown component "Map"/);

    const badProp = validateSurface([
      {
        updateComponents: {
          components: [{ component: 'Text', id: 'root', text: 5 }],
          surfaceId: 's',
        },
        version: '1.0',
      },
    ]);
    expect(!badProp.ok && badProp.errors.join()).toMatch(/Text/);

    const noRoot = validateSurface([
      {
        updateComponents: {
          components: [{ component: 'Text', id: 'a', text: 'x' }],
          surfaceId: 's',
        },
        version: '1.0',
      },
    ]);
    expect(!noRoot.ok && noRoot.errors).toContain('One component must have id "root"');

    const twoSurfaces = validateSurface([
      { createSurface: { catalogId: '', surfaceId: 'a' }, version: '1.0' },
      { createSurface: { catalogId: '', surfaceId: 'b' }, version: '1.0' },
    ]);
    expect(!twoSurfaces.ok && twoSurfaces.errors[0]).toMatch(/one surface/);

    const http = validateSurface([
      {
        updateComponents: {
          components: [{ component: 'Image', id: 'root', url: 'http://x/a.png' }],
          surfaceId: 's',
        },
        version: '1.0',
      },
    ]);
    expect(!http.ok && http.errors[0]).toMatch(/https/);

    expect(validateSurface('not json')).toMatchObject({ ok: false });
    expect(validateSurface([])).toMatchObject({ ok: false });
  });
});

describe('Chart', () => {
  const chart = (data: unknown[]) =>
    validateSurface([
      {
        updateComponents: {
          components: [
            { child: 'c', component: 'Card', id: 'root' },
            {
              categories: ['p95'],
              component: 'Chart',
              data,
              id: 'c',
              index: 'hour',
              title: 'Hourly P95',
              type: 'line',
            },
          ],
          surfaceId: 's',
        },
        version: '1.0',
      },
    ]);

  it('accepts a chart and names it in the card text', () => {
    const result = chart([
      { hour: '00', p95: 0.9 },
      { hour: '01', p95: 1.6 },
    ]);
    expect(result.ok).toBe(true);
    expect(result.ok && surfaceToText(result.record)).toBe('Hourly P95');
  });

  it('refuses a chart with more rows than a picture can carry', () => {
    const result = chart(Array.from({ length: 201 }, (_, hour) => ({ hour, p95: 1 })));
    expect(!result.ok && result.errors[0]).toMatch(/at most 200 rows/);
  });
});

describe('official A2UI basic catalog', () => {
  const examples = loadExamples(['basic']).map((example) => ({ ...example, file: example.id }));

  it('ships the basic catalog verbatim and keeps every official component, prop and function', () => {
    expect(BASIC_CATALOG_DOCUMENT.catalogId).toBe(
      'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json',
    );
    const propsOf = (schema: unknown): Set<string> => {
      const found = new Set<string>();
      const walk = (node: any) => {
        if (!node || typeof node !== 'object') return;
        if (node.properties) for (const key of Object.keys(node.properties)) found.add(key);
        for (const key of ['allOf', 'oneOf', 'anyOf'])
          for (const item of node[key] ?? []) walk(item);
      };
      walk(schema);
      return found;
    };
    for (const [name, schema] of Object.entries(BASIC_CATALOG_DOCUMENT.components)) {
      expect(A2UI_COMPONENT_NAMES.has(name)).toBe(true);
      const merged = propsOf(A2UI_CATALOG_DOCUMENT.components[name]);
      for (const prop of propsOf(schema)) expect(merged.has(prop), `${name}.${prop}`).toBe(true);
    }
    expect([...A2UI_FUNCTION_NAMES].sort()).toEqual(
      Object.keys(BASIC_CATALOG_DOCUMENT.functions!).sort(),
    );
    expect(A2UI_BASIC_COMPONENT_NAMES).toHaveLength(18);
  });

  it('ships all 43 official examples', () => expect(examples).toHaveLength(43));

  it.each(examples.map((example) => [example.file, example]))(
    'accepts the official example %s',
    (_, example) => {
      const result = validateSurface(example.messages);
      expect(result.ok ? [] : result.errors).toEqual([]);
      expect(result.ok && surfaceToText(result.record).length).toBeGreaterThan(0);
    },
  );
});

describe('LobeHub extensions and safety', () => {
  const surface = (components: Record<string, unknown>[], value?: Record<string, unknown>) =>
    validateSurface([
      { updateComponents: { components, surfaceId: 's' }, version: '1.0' },
      ...(value ? [{ updateDataModel: { path: '/', surfaceId: 's', value }, version: '1.0' }] : []),
    ]);

  it('accepts any root and reads extensions back as text', () => {
    const result = surface([
      { children: ['t', 'kv', 'steps', 'p'], component: 'Column', id: 'root' },
      {
        columns: [
          { key: 'plan', label: 'Plan' },
          { align: 'end', key: 'price', label: 'Price' },
        ],
        component: 'Table',
        id: 't',
        rows: [{ plan: 'Pro', price: 19 }],
      },
      { component: 'KeyValue', id: 'kv', items: [{ label: 'Seats', value: '20' }] },
      {
        component: 'Steps',
        id: 'steps',
        items: [{ meta: '09:00', status: 'done', title: 'Ship' }],
      },
      { caption: '7 / 10 GB', component: 'Progress', id: 'p', label: 'Storage', value: 70 },
    ]);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.ok && surfaceToText(result.record)).toBe(
      'Pro, 19 · Seats: 20 · 09:00 Ship · Storage 7 / 10 GB',
    );
  });

  it('checks extension props against the catalog schema', () => {
    const bogus = surface([
      { component: 'Metrics', id: 'root', items: [{ bogus: 1, label: 'a', value: '1' }] },
    ]);
    expect(!bogus.ok && bogus.errors.join()).toMatch(/Unrecognized key\(s\) in object: 'bogus'/);
    const wide = surface([
      {
        columns: Array.from({ length: 9 }, (_, i) => ({ key: `k${i}`, label: `K${i}` })),
        component: 'Table',
        id: 'root',
        rows: [],
      },
    ]);
    expect(wide.ok).toBe(false);
    const grid = surface([{ children: ['a'], columns: 6, component: 'Grid', id: 'root' }]);
    const items = surface([{ component: 'Items', id: 'root', items: [], title: 'x' }]);
    expect(!items.ok && items.errors[0]).toMatch(/Unknown component "Items"/);
    expect(grid.ok).toBe(false);
    const chart = surface([{ component: 'Chart', data: [], id: 'root', index: 'x', type: 'pie' }]);
    expect(chart.ok).toBe(false);
  });

  it('caps bound lists like literal ones', () => {
    const result = surface(
      [
        {
          columns: [{ key: 'n', label: 'N' }],
          component: 'Table',
          id: 'root',
          rows: { '@path': '/rows' },
        },
      ],
      { rows: Array.from({ length: 51 }, (_, n) => ({ n })) },
    );
    expect(!result.ok && result.errors).toContain('Table root: at most 50 rows');
  });

  it('keeps media and links on https, bound data included', () => {
    const image = surface([{ component: 'Image', id: 'root', url: 'http://x.com/a.png' }]);
    expect(!image.ok && image.errors).toContain('Image root: url must be https');
    const video = surface(
      [
        {
          component: 'Video',
          id: 'root',
          posterUrl: { '@path': '/p' },
          url: 'https://x.com/v.mp4',
        },
      ],
      { p: 'javascript:alert(1)' },
    );
    expect(!video.ok && video.errors).toContain('Video root: posterUrl must be https');
    const audio = surface([
      { component: 'AudioPlayer', id: 'root', url: 'data:audio/mp3;base64,AA' },
    ]);
    expect(audio.ok).toBe(false);
    const link = surface([
      {
        action: { functionCall: { args: { url: 'http://x.com' }, call: 'openUrl' } },
        child: 'l',
        component: 'Button',
        id: 'root',
      },
      { component: 'Text', id: 'l', text: 'Open' },
    ]);
    expect(!link.ok && link.errors).toContain('Button root: openUrl needs an https url');
  });

  it('checks icon names against the bundled set and suggests close ones', () => {
    const ok = surface([
      { children: ['a', 'b', 'c'], component: 'Row', id: 'root' },
      { component: 'Icon', id: 'a', name: 'home' },
      { component: 'Icon', id: 'b', name: 'lucide:trending-up' },
      { component: 'Icon', id: 'c', name: 'lucide:TrendingUp' },
    ]);
    expect(ok.ok ? [] : ok.errors).toEqual([]);

    const unknown = surface([{ component: 'Icon', id: 'root', name: 'lucide:trending-upp' }]);
    expect(!unknown.ok && unknown.errors[0]).toMatch(
      /No lucide icon named "trending-upp" in the card set\. Did you mean: .*lucide:trending-up/,
    );
    const basic = surface([{ component: 'Icon', id: 'root', name: 'rocket' }]);
    expect(!basic.ok && basic.errors[0]).toMatch(/not a basic icon name/);
    for (const name of ['simple:github', 'lobehub:openai']) {
      const brand = surface([{ component: 'Icon', id: 'root', name }]);
      expect(brand.ok).toBe(false);
    }
    const unbundled = surface([{ component: 'Icon', id: 'root', name: 'lucide:a-arrow-down' }]);
    expect(!unbundled.ok && unbundled.errors[0]).toMatch(/in the card set/);
    const extra = surface([{ component: 'Icon', id: 'root', name: 'home', set: 'lucide' }]);
    expect(extra.ok).toBe(false);
    const svg = surface([
      { component: 'Icon', id: 'root', name: { svgPath: 'M0 0"/><script>alert(1)</script>' } },
    ]);
    expect(!svg.ok && svg.errors).toContain('Icon root: svgPath is not path data');
  });

  it('splits a createSurface that carries its components and data model inline', () => {
    const result = validateSurface([
      {
        createSurface: {
          catalogId: 'x',
          components: [{ component: 'Text', id: 'root', text: { '@path': '/t' } }],
          dataModel: { t: 'Hello' },
          surfaceId: 'inline',
        },
        version: '1.0',
      },
    ]);
    expect(result.ok ? [] : result.errors).toEqual([]);
    expect(result.ok && result.record.operations.map((op) => Object.keys(op).sort())).toEqual([
      ['createSurface', 'version'],
      ['updateComponents', 'version'],
      ['updateDataModel', 'version'],
    ]);
    expect(result.ok && surfaceToText(result.record)).toBe('Hello');
  });
});
