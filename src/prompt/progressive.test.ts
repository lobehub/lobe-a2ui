import { describe, expect, it } from 'vitest';

import { BASIC_CATALOG_DOCUMENT } from '../catalog';
import { createA2uiProcessor, getA2uiSystemPrompt, runA2uiDocsTool, runA2uiTool } from '../processor';
import { buildA2uiPrompt } from '.';

/** What the official Direct JSON generator injects for the basic catalog alone, without examples. */
const officialPromptSize = () =>
  buildA2uiPrompt({ catalog: BASIC_CATALOG_DOCUMENT, examples: false }).length;

describe('progressive prompt', () => {
  it('always injects less than a third of the official basic-catalog prompt', () => {
    expect(getA2uiSystemPrompt().length).toBeLessThan(officialPromptSize() / 3);
  });

  it('indexes every component and function in one line each, with their props', () => {
    const prompt = getA2uiSystemPrompt();
    expect(prompt).toMatch(/- Chart\(type: "line"\|"area"/);
    expect(prompt).toMatch(/- Metrics\(items: \{label, value, delta\?/);
    expect(prompt).toMatch(/- Tabs\(tabs: \{title, child\}\[\]/);
    expect(prompt).toMatch(/- formatCurrency\(value, currency, decimals\?, grouping\?\) → string/);
  });

  it('reads the full schema and the smallest examples of the asked components on demand', () => {
    const docs = runA2uiDocsTool({ components: ['Table', 'formatNumber', 'Map'] });
    expect(docs).toContain('Not in the catalog: Map');
    expect(docs).toContain('---BEGIN A2UI JSON SCHEMA---');
    expect(docs).toContain('"Table"');
    expect(docs).toContain('"formatNumber"');
    expect(docs).not.toContain('"Chart":');
    expect(docs).toContain('### Examples:');
  });

  it('returns the schemas of the components a failed card got wrong', () => {
    const result = runA2uiTool({
      operations: [
        {
          updateComponents: {
            components: [{ component: 'Chart', data: [], id: 'root', type: 'pie' }],
            surfaceId: 's',
          },
          version: '1.0',
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.content).toContain('Schemas of the components involved');
    expect(result.content).toContain('"Chart"');
  });

  it('keeps the official full prompt available', () => {
    const full = createA2uiProcessor({ prompt: 'full' }).promptSnippet;
    expect(full).toContain('---BEGIN A2UI JSON SCHEMA---');
    expect(full.length).toBeGreaterThan(getA2uiSystemPrompt().length * 3);
  });
});
