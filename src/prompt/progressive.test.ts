import { describe, expect, it } from 'vitest';

import { BASIC_CATALOG_DOCUMENT } from '../catalog';
import {
  createA2uiProcessor,
  getA2uiSystemPrompt,
  runA2uiDocsTool,
  runA2uiTool,
} from '../processor';
import { buildA2uiPrompt } from '.';

/** What the official Direct JSON generator injects for the basic catalog alone, without examples. */
const officialPromptSize = () =>
  buildA2uiPrompt({ catalog: BASIC_CATALOG_DOCUMENT, examples: false }).length;

/**
 * The official A2UI playground's always-on prompt: its `a2ui-playground` skill for the catalog this
 * one follows (CopilotKit, MIT), 48,083 characters.
 */
const OFFICIAL_PLAYGROUND_PROMPT_SIZE = 48_083;

describe('progressive prompt', () => {
  it('always injects less than half of the official playground prompt for the same catalog', () => {
    expect(getA2uiSystemPrompt().length).toBeLessThan(OFFICIAL_PLAYGROUND_PROMPT_SIZE / 2);
  });

  it('stays under the official full prompt for the basic catalog alone', () => {
    expect(getA2uiSystemPrompt().length).toBeLessThan(officialPromptSize());
  });

  it('indexes every component and function in one line each, with their props', () => {
    const prompt = getA2uiSystemPrompt();
    expect(prompt).toMatch(/- LineChart\(title\?: string, subtitle\?: string/);
    expect(prompt).toMatch(/- StatGroup\(items: \{label, value, delta\?, trend\?\}\[\]/);
    // Retired 1.x components and props kept for replay stay out of the index.
    expect(prompt).not.toMatch(/- Metrics\(/);
    expect(prompt).not.toMatch(/Avatar\([^)]*shape\?/);
    expect(prompt).toMatch(/- Tabs\(tabs: \{title, child\}\[\]/);
    expect(prompt).toMatch(/- formatCurrency\(value, currency, decimals\?, grouping\?\) → string/);
  });

  it('reads the full schema and the smallest examples of the asked components on demand', () => {
    const docs = runA2uiDocsTool({ components: ['DataTable', 'formatNumber', 'Map'] });
    expect(docs).toContain('Not in the catalog: Map');
    expect(docs).toContain('---BEGIN A2UI JSON SCHEMA---');
    expect(docs).toContain('"DataTable"');
    expect(docs).toContain('"formatNumber"');
    expect(docs).not.toContain('"LineChart":');
    expect(docs).toContain('### Examples:');
  });

  it('returns the schemas of the components a failed card got wrong', () => {
    const result = runA2uiTool({
      operations: [
        {
          updateComponents: {
            components: [{ component: 'PieChart', data: [{ label: 'a' }], id: 'root' }],
            surfaceId: 's',
          },
          version: '1.0',
        },
      ],
    });
    expect(result.success).toBe(false);
    expect(result.content).toContain('Schemas of the components involved');
    expect(result.content).toContain('"PieChart"');
  });

  it('keeps the official full prompt available', () => {
    const full = createA2uiProcessor({ prompt: 'full' }).promptSnippet;
    expect(full).toContain('---BEGIN A2UI JSON SCHEMA---');
    expect(full.length).toBeGreaterThan(getA2uiSystemPrompt().length * 3);
  });
});
