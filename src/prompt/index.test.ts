import { describe, expect, it } from 'vitest';

import { A2UI_CATALOG_ID, A2UI_COMPONENT_NAMES } from '../catalog';
import { validateSurface } from '../validate';
import {
  A2UI_PROMPT_EXAMPLES,
  A2UI_SCHEMA_BLOCK_END,
  A2UI_SCHEMA_BLOCK_START,
  buildA2uiPrompt,
  loadExamples,
} from './index';

const schemaSection = (prompt: string, heading: string) => {
  const start = prompt.indexOf(`### ${heading}:\n`) + heading.length + 6;
  return JSON.parse(prompt.slice(start, prompt.indexOf('\n', start)));
};

describe('buildA2uiPrompt', () => {
  const prompt = buildA2uiPrompt();

  it('lays out rules, one schema block and the examples like the official generator', () => {
    expect(prompt.indexOf('The generated UI MUST follow these rules')).toBe(0);
    expect(prompt.split(A2UI_SCHEMA_BLOCK_START)).toHaveLength(2);
    expect(prompt.indexOf(A2UI_SCHEMA_BLOCK_END)).toBeGreaterThan(
      prompt.indexOf(A2UI_SCHEMA_BLOCK_START),
    );
    expect(prompt).toContain('renderUI');
    expect(prompt).not.toContain('<a2ui-json>');
  });

  it('derives the catalog section from the merged catalog document', () => {
    const catalog = schemaSection(prompt, 'Catalog Schema');
    expect(catalog.catalogId).toBe(A2UI_CATALOG_ID);
    expect(new Set(Object.keys(catalog.components))).toEqual(A2UI_COMPONENT_NAMES);
    // Descriptions live in the schema, as the catalog writes them.
    expect(catalog.components.StatGroup.description).toMatch(/several KPIs/);
    expect(catalog.components.Metrics).toBeUndefined();
    expect(catalog.components.Card).toEqual(JSON.parse(JSON.stringify(catalog.components.Card)));
  });

  it('keeps only the drawing messages and the common types they and the catalog use', () => {
    const messages = schemaSection(prompt, 'Agent to Renderer Schema');
    expect(messages.oneOf.map((item: { $ref: string }) => item.$ref)).toEqual([
      '#/$defs/CreateSurfaceMessage',
      '#/$defs/UpdateComponentsMessage',
      '#/$defs/UpdateDataModelMessage',
    ]);
    const common = schemaSection(prompt, 'Common Types Schema');
    expect(Object.keys(common.$defs)).toContain('DynamicString');
    expect(Object.keys(common.$defs)).not.toContain('FunctionResponse');
  });

  it('prunes to chosen components', () => {
    const small = buildA2uiPrompt({ components: ['Card', 'Column', 'Text'], examples: false });
    const catalog = schemaSection(small, 'Catalog Schema');
    expect(Object.keys(catalog.components).sort()).toEqual(['Card', 'Column', 'Text']);
    expect(small.length).toBeLessThan(prompt.length / 2);
  });

  it.each(A2UI_PROMPT_EXAMPLES.map((example) => [example.name, example]))(
    'shows a valid example: %s',
    (_, example) => {
      const result = validateSurface(example.messages);
      expect(result.ok ? [] : result.errors).toEqual([]);
    },
  );

  it.each(loadExamples(['lobehub']).map((example) => [example.id, example]))(
    'ships a valid LobeHub example: %s',
    (_, example) => {
      const result = validateSurface(example.messages);
      expect(result.ok ? [] : result.errors).toEqual([]);
    },
  );

  it('shows examples of different shapes, not one template', () => {
    const roots = A2UI_PROMPT_EXAMPLES.map((example) => {
      const update = example.messages.find((message) => message.updateComponents) as any;
      return update.updateComponents.components.find((c: any) => c.id === 'root').component;
    });
    expect(new Set(roots).size).toBeGreaterThan(1);
    const used = new Set(
      A2UI_PROMPT_EXAMPLES.flatMap((example) =>
        example.messages.flatMap((message: any) =>
          (message.updateComponents?.components ?? []).map((c: any) => c.component),
        ),
      ),
    );
    expect(used.size).toBeGreaterThanOrEqual(20);
  });
});
