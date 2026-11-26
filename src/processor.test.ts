import { writeFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { createA2uiProcessor } from './processor';

const chart = [
  {
    updateComponents: {
      components: [
        {
          component: 'BarChart',
          data: [
            { x: 'a', y: 1 },
            { x: 'b', y: 2 },
            { x: 'c', y: 3 },
          ],
          id: 'root',
        },
      ],
      surfaceId: 's',
    },
    version: '1.0',
  },
];

describe('createA2uiProcessor', () => {
  it('describes and checks only the catalogs the host renderer supports', () => {
    const basic = createA2uiProcessor({ catalogs: ['basic'] });
    expect(basic.catalog.components.BarChart).toBeUndefined();
    expect(basic.examples.every((example) => example.catalog === 'basic')).toBe(true);
    expect(basic.promptSnippet).not.toContain('"BarChart"');
    const result = basic.execute({ operations: chart });
    expect(result.success).toBe(false);
    expect(!result.success && result.content).toMatch(/Unknown component "BarChart"/);

    const full = createA2uiProcessor();
    expect(full.execute({ operations: chart }).success).toBe(true);
    expect(full.examples.some((example) => example.catalog === 'lobehub')).toBe(true);
  });

  it('prunes components and functions like the official transformers', () => {
    const small = createA2uiProcessor({
      examples: false,
      prune: { components: ['Column', 'Text', 'BarChart'], functions: ['formatNumber'] },
    });
    expect(Object.keys(small.catalog.components).sort()).toEqual(['BarChart', 'Column', 'Text']);
    expect(Object.keys(small.catalog.functions!)).toEqual(['formatNumber']);
    const call = small.validate([
      {
        updateComponents: {
          components: [
            {
              component: 'Text',
              id: 'root',
              text: { '@call': 'formatDate', 'args': { format: 'y', value: '2026-01-01' } },
            },
          ],
          surfaceId: 's',
        },
        version: '1.0',
      },
    ]);
    expect(!call.ok && call.errors[0]).toMatch(/unknown function "formatDate"/);
  });

  it('validates its examples when built', () => {
    expect(() =>
      createA2uiProcessor({
        examples: [{ catalog: 'basic', id: 'bad', messages: [{ bogus: true }], name: 'Bad' }],
      }),
    ).toThrow(/example "bad" is invalid/);
  });

  it('words the snippet for the tool or the CLI', () => {
    expect(createA2uiProcessor().promptSnippet).toContain('renderUI');
    expect(createA2uiProcessor({ delivery: 'cli' }).promptSnippet).toContain('lh card render');
  });

  it('reports prompt sizes', () => {
    const sizes = {
      'basic, no examples': createA2uiProcessor({ catalogs: ['basic'], examples: false }),
      'basic + lobehub, all 57 examples': createA2uiProcessor({ examples: 'all' }),
      'basic + lobehub, default examples': createA2uiProcessor(),
      'basic + lobehub, no examples': createA2uiProcessor({ examples: false }),
      'basic only, default examples': createA2uiProcessor({ catalogs: ['basic'] }),
      'pruned to 8 components': createA2uiProcessor({
        prune: {
          components: [
            'Card',
            'Column',
            'Row',
            'Text',
            'Icon',
            'StatGroup',
            'BarChart',
            'DataTable',
          ],
        },
      }),
    };
    const lines = Object.entries(sizes).map(
      ([name, processor]) =>
        `${name}: ${processor.promptSnippet.length} chars, ${processor.examples.length} examples`,
    );
    if (process.env.A2UI_PROMPT_SIZES)
      writeFileSync(process.env.A2UI_PROMPT_SIZES, lines.join('\n'));
    expect(lines).toHaveLength(6);
  });
});
