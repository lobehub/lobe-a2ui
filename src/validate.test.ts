import { describe, expect, it } from 'vitest';

import { A2UI_CATALOG_ID } from './catalog';
import { surfaceToText } from './fallback';
import { validateSurface } from './validate';

const report = [
  { createSurface: { catalogId: 'anything', surfaceId: 'dc' }, version: '1.0' },
  {
    updateComponents: {
      components: [
        {
          child: 'col',
          component: 'Card',
          description: '3,214 requests',
          id: 'root',
          title: 'DC daily check',
        },
        { children: ['m', 'p1', 'go'], component: 'Column', id: 'col' },
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
      'DC daily check · 3,214 requests · error-log 225 +62% · P1 · balance exhausted · Rotate key',
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
            { child: 'c', component: 'Card', id: 'root', title: 'Latency' },
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
    expect(result.ok && surfaceToText(result.record)).toBe('Latency · Hourly P95');
  });

  it('refuses a chart with more rows than a picture can carry', () => {
    const result = chart(Array.from({ length: 201 }, (_, hour) => ({ hour, p95: 1 })));
    expect(!result.ok && result.errors[0]).toMatch(/at most 200 rows/);
  });
});
